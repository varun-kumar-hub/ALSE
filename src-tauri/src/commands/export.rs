use std::fs;
use std::path::PathBuf;

/// Export formatted markdown chat report
#[tauri::command]
pub fn export_chat_markdown(
    file_path: String,
    content: String,
) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    fs::write(&path, content)
        .map_err(|e| format!("Failed to export markdown: {}", e))?;

    Ok(file_path)
}
