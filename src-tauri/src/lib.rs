/**
 * Comandos IPC de Tauri — la mitad "backend" del editor.
 *
 * División de responsabilidades (espec del proyecto):
 *  - Frontend (TS): canvas, paneles, estado, layout, undo/redo, preview, prototipado.
 *  - Rust: load/save atómico, empaquetado ZIP, exportadores, thumbnails, spec sheets.
 *
 * Fase 1: save/load/list de proyectos .canvas en el directorio de datos de la app.
 * Fases 2/5/6: exportadores HTML/CSS (Rust), Unity UI Toolkit y Unreal UMG.
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            list_projects,
            export_html
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
