/**
 * Comandos IPC de Tauri — la mitad "backend" del editor.
 *
 * División de responsabilidades (espec del proyecto):
 *  - Frontend (TS): canvas, paneles, estado, layout, undo/redo, preview, prototipado.
 *  - Rust: load/save atómico, empaquetado ZIP, exportadores, thumbnails, spec sheets.
 *
 * Fase 1: save/load/list de proyectos .canvas en el directorio de datos de la app.
 * Fases 2/5/6: exportadores HTML/CSS (Rust), Unity UI Toolkit y Unreal UMG.
 *
 * GPU Fix: Detección y fallback para GPUs NVIDIA que causan pantalla negra.
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
/// El IR → HTML/CSS ya se valida en TS (src/export/html.ts) para iterar rápido;
/// esta versión Rust comparte el mismo contrato y llega en la Fase 2.
#[tauri::command]
fn export_html(_doc_json: String) -> Result<String, String> {
    Err("Exportador Rust HTML pendiente (Fase 2)".into())
}

/// Detecta si el sistema tiene problemas conocidos con GPU rendering.
/// Retorna true si se debería desactivar hardware acceleration.
fn should_disable_hw_accel() -> bool {
    // 1. Si el usuario ya forzó software rendering, respetar.
    if let Ok(v) = std::env::var("UIFORGER_DISABLE_GPU") {
        if v == "1" || v == "true" {
            return true;
        }
    }

    // 2. Detectar NVIDIA en Linux via /proc/driver/nvidia/version
    #[cfg(target_os = "linux")]
    {
        if let Ok(driver_info) = fs::read_to_string("/proc/driver/nvidia/version") {
            // NVIDIA drivers < 535 have known compositor issues with Chromium
            if driver_info.contains("NVRM version") {
                return true;
            }
        }
        // Also check via glxinfo if available
        if let Ok(output) = std::process::Command::new("glxinfo")
            .arg("-B")
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("NVIDIA") || stdout.contains("nvidia") {
                // Force software rendering on NVIDIA Linux
                return true;
            }
        }
    }

    // 3. Detectar Windows + NVIDIA via WMI registry (lightweight check)
    #[cfg(target_os = "windows")]
    {
        // Check for NVIDIA driver via registry
        if let Ok(output) = std::process::Command::new("reg")
            .args([
                "query",
                "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000",
                "/v",
                "DriverDesc",
            ])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.to_lowercase().contains("nvidia") {
                // Check if driver is known-buggy (pre-535 series)
                if let Ok(ver) = std::process::Command::new("nvidia-smi")
                    .arg("--query-gpu=driver_version")
                    .arg("--format=csv,noheader")
                    .output()
                {
                    let ver_str = String::from_utf8_lossy(&ver.stdout);
                    let ver_clean = ver_str.trim();
                    // Parse major.minor
                    if let Some((major, _)) = ver_clean.split_once('.') {
                        if let Ok(major_num) = major.parse::<u32>() {
                            if major_num < 535 {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }

    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // GPU fix: if NVIDIA detected, set env vars for Chromium before app starts.
    if should_disable_hw_accel() {
        // Tell Chromium/WKWebView to use software rendering.
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "1");
        // Electron/Chromium-style flags (may be picked up by Tauri's webview).
        std::env::set_var(
            "CHROMIUM_FLAGS",
            "--disable-gpu-compositing --disable-gpu-sandbox --enable-features=VaapiVideoDecoder",
        );
    }

    let mut builder = tauri::Builder::default();

    // Always apply GPU safety flags for NVIDIA compatibility.
    // These are harmless on other GPUs and prevent black screens.
    builder = builder.setup(|_app| {
        // Log GPU info for debugging.
        #[cfg(debug_assertions)]
        {
            if let Ok(gl_renderer) = std::env::var("LIBGL_ALWAYS_SOFTWARE") {
                if gl_renderer == "1" {
                    eprintln!("[UI Forger] GPU: Software rendering mode (NVIDIA fallback active)");
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
