use std::fs;
use std::path::{Component, Path, PathBuf};

/// Get default workspace directory (%USERPROFILE%/ai-os-workspace)
#[tauri::command]
pub fn get_default_workspace_path() -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Could not determine user home directory".to_string())?;

    let path = Path::new(&home).join("ai-os-workspace");
    Ok(path.to_string_lossy().to_string())
}

/// Initialize workspace directory structure
#[tauri::command]
pub fn init_workspace(custom_path: Option<String>) -> Result<String, String> {
    let workspace_path = match custom_path {
        Some(p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => {
            let home = std::env::var("USERPROFILE")
                .or_else(|_| std::env::var("HOME"))
                .map_err(|_| "Could not determine home directory".to_string())?;
            Path::new(&home).join("ai-os-workspace")
        }
    };

    let subdirs = [
        "database",
        "chats",
        "reports",
        "downloads",
        "cache",
        "logs",
        "settings",
        "templates",
        "plugins",
        "prompts",
        "temp",
    ];

    for sub in &subdirs {
        let dir = workspace_path.join(sub);
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create workspace directory {}: {}", sub, e))?;
    }

    let metadata = workspace_path.join("settings").join("workspace.json");
    if !metadata.exists() {
        let content = format!(
            "{{\n  \"version\": 1,\n  \"created_by\": \"AI Operating System\",\n  \"workspace_path\": \"{}\"\n}}\n",
            workspace_path.to_string_lossy().replace('\\', "\\\\")
        );
        fs::write(&metadata, content)
            .map_err(|e| format!("Failed to write workspace metadata: {}", e))?;
    }

    Ok(workspace_path.to_string_lossy().to_string())
}

/// Save a report or markdown file in the workspace
#[tauri::command]
pub fn save_workspace_file(
    folder: String,
    filename: String,
    content: String,
    custom_workspace: Option<String>,
) -> Result<String, String> {
    let base_path = match custom_workspace {
        Some(p) => PathBuf::from(p),
        None => {
            let home = std::env::var("USERPROFILE")
                .or_else(|_| std::env::var("HOME"))
                .map_err(|_| "Could not find home directory".to_string())?;
            Path::new(&home).join("ai-os-workspace")
        }
    };

    let safe_folder = sanitize_relative_segment(&folder)?;
    let safe_filename = sanitize_filename(&filename)?;
    let target_dir = base_path.join(safe_folder);
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create folder: {}", e))?;

    let file_path = target_dir.join(safe_filename);
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

fn sanitize_relative_segment(value: &str) -> Result<PathBuf, String> {
    let path = Path::new(value);
    if path.is_absolute()
        || path
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::RootDir | Component::Prefix(_)))
    {
        return Err("Folder must stay inside the workspace".to_string());
    }
    Ok(path.to_path_buf())
}

fn sanitize_filename(value: &str) -> Result<String, String> {
    let invalid = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let cleaned: String = value
        .chars()
        .map(|ch| if invalid.contains(&ch) || ch.is_control() { '_' } else { ch })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').to_string();

    if trimmed.is_empty() {
        Err("Filename cannot be empty".to_string())
    } else {
        Ok(trimmed)
    }
}
