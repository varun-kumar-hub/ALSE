use super::runtime_manager::RuntimeContext;
use std::fs;
use std::path::{Path, PathBuf};

pub fn ensure_workspace(ctx: &mut RuntimeContext) -> Result<(), String> {
    let workspace_path = default_workspace_path()?;
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

    for subdir in subdirs {
        fs::create_dir_all(workspace_path.join(subdir))
            .map_err(|e| format!("Unable to prepare workspace: {}", e))?;
    }

    fs::write(
        workspace_path.join("settings").join("runtime.json"),
        "{\n  \"runtime_manager\": true,\n  \"version\": 1\n}\n",
    )
    .map_err(|e| format!("Unable to write runtime configuration: {}", e))?;

    ctx.workspace_path = Some(workspace_path.to_string_lossy().to_string());
    ctx.log("Workspace prepared");
    Ok(())
}

pub fn write_runtime_log(ctx: &RuntimeContext) {
    let Some(path) = &ctx.workspace_path else {
        return;
    };

    let log_dir = Path::new(path).join("logs");
    let _ = fs::create_dir_all(&log_dir);
    let _ = fs::write(log_dir.join("runtime-manager.log"), ctx.diagnostics.join("\n"));
}

fn default_workspace_path() -> Result<PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Unable to determine local workspace location".to_string())?;

    Ok(Path::new(&home).join("ai-os-workspace"))
}
