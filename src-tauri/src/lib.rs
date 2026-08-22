/**
 * Comandos IPC de Tauri — la mitad "backend" del editor.
 *
 * División de responsabilidades (espec del proyecto):
 *  - Frontend (TS): canvas, paneles, estado, layout, undo/redo, preview, prototipado.
 *  - Rust: load/save atómico, empaquetado ZIP, exportadores, thumbnails, spec sheets.
 *
 * GPU Fix: Detección y fallback para GPUs NVIDIA y AMD que causan pantalla negra.
 */
use std::fs;
use tauri::Manager;

/// Guarda un proyecto .canvas (bytes del ZIP generado en TS) con nombre saneado.
#[tauri::command]
fn save_project(app: tauri::AppHandle, project_name: String, contents: Vec<u8>) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe = project_name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let path = dir.join(format!("{safe}.canvas"));
    // Escritura atómica: .tmp + rename (evita corromper el archivo ante cierres).
    let tmp = dir.join(format!("{safe}.canvas.tmp"));
    fs::write(&tmp, &contents).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Carga el contenido binario de un proyecto guardado.
#[tauri::command]
fn load_project(app: tauri::AppHandle, project_name: String) -> Result<Vec<u8>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let safe = project_name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let path = dir.join(format!("{safe}.canvas"));
    fs::read(&path).map_err(|e| e.to_string())
}

/// Lista los nombres de proyectos guardados en esta máquina.
#[tauri::command]
fn list_projects(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if let Some(stem) = name.strip_suffix(".canvas") {
                    names.push(stem.to_string());
                }
            }
        }
    }
    Ok(names)
}

/// Exportador HTML/CSS en Rust (Fase 2).
#[tauri::command]
fn export_html(_doc_json: String) -> Result<String, String> {
    Err("Exportador Rust HTML pendiente (Fase 2)".into())
}

/// Detecta GPUs con problemas conocidos de composición en Chromium.
/// Retorna true si se debería desactivar hardware acceleration.
///
/// Afectados: NVIDIA (drivers < 535), AMD (R7/R9/RX con drivers antiguos),
/// y GPUs integradas Intel antiguas.
fn should_disable_hw_accel() -> bool {
    // 1. Si el usuario ya forzó software rendering, respetar.
    if let Ok(v) = std::env::var("UIFORGER_DISABLE_GPU") {
        if v == "1" || v == "true" {
            return true;
        }
    }

    // 2. Linux: detectar GPU via /proc/driver/nvidia o glxinfo
    #[cfg(target_os = "linux")]
    {
        if let Ok(driver_info) = fs::read_to_string("/proc/driver/nvidia/version") {
            if driver_info.contains("NVRM version") {
                return true;
            }
        }
        if let Ok(output) = std::process::Command::new("glxinfo")
            .arg("-B")
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let lower = stdout.to_lowercase();
            if lower.contains("nvidia") || lower.contains("amd") || lower.contains("radeon") {
                return true;
            }
        }
    }

    // 3. Windows: detectar GPU via registry (NVIDIA + AMD)
    #[cfg(target_os = "windows")]
    {
        // Buscar en la registry de display adapters (GPU index 0000)
        // NVIDIA: {4d36e968-e325-11ce-bfc1-08002be10318}\0000
        // AMD:    {4d36e968-e325-11ce-bfc1-08002be10318}\0001 o similar
        for adapter_idx in 0..4 {
            let reg_key = format!(
                "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{{4d36e968-e325-11ce-bfc1-08002be10318}}\\{:04}",
                adapter_idx
            );
            if let Ok(output) = std::process::Command::new("reg")
                .args(["query", &reg_key, "/v", "DriverDesc"])
                .output()
            {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let lower = stdout.to_lowercase();

                // NVIDIA: verificar versión del driver
                if lower.contains("nvidia") {
                    if let Ok(ver) = std::process::Command::new("nvidia-smi")
                        .arg("--query-gpu=driver_version")
                        .arg("--format=csv,noheader")
                        .output()
                    {
                        let ver_str = String::from_utf8_lossy(&ver.stdout);
                        let ver_clean = ver_str.trim();
                        if let Some((major, _)) = ver_clean.split_once('.') {
                            if let Ok(major_num) = major.parse::<u32>() {
                                if major_num < 535 {
                                    return true;
                                }
                            }
                        }
                    }
                    // NVIDIA drivers recientes generalmente funcionan, pero
                    // forzar fallback por si acaso (cauteloso)
                    return true;
                }

                // AMD: Radeon R7/R9/RX — known compositing issues
                if lower.contains("amd") || lower.contains("radeon") {
                    // AMD GPUs frequently have Chromium compositing bugs.
                    // Force software rendering as safe default.
                    return true;
                }
            }
        }
    }

    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // GPU fix: si se detecta GPU problemática, forzar software rendering.
    if should_disable_hw_accel() {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "1");
        std::env::set_var(
            "CHROMIUM_FLAGS",
            "--disable-gpu-compositing --disable-gpu-sandbox",
        );
        eprintln!("[UI Forger] GPU: Software rendering mode active (problematic GPU detected)");
    }

    let mut builder = tauri::Builder::default();

    builder = builder.setup(|_app| {
        #[cfg(debug_assertions)]
        {
            if let Ok(v) = std::env::var("LIBGL_ALWAYS_SOFTWARE") {
                if v == "1" {
                    eprintln!("[UI Forger] GPU: Software rendering mode (NVIDIA/AMD fallback active)");
                }
            }
        }
        Ok(())
    });

    builder
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            list_projects,
            export_html
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
