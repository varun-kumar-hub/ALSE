use super::runtime_manager::RuntimeContext;
use crate::services::ollama_manager;
use std::process::Command;

pub async fn repair_missing_components(ctx: &mut RuntimeContext) -> Result<(), String> {
    if matches!(
        ollama_manager::detect_installation(),
        ollama_manager::InstallStatus::Installed { .. }
    ) {
        ctx.log("AI runtime component already installed");
        return Ok(());
    }

    ctx.log("AI runtime component missing; attempting automatic repair");

    #[cfg(target_os = "windows")]
    {
        let status = Command::new("winget")
            .args([
                "install",
                "--id",
                "Ollama.Ollama",
                "--silent",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ])
            .status();

        if matches!(status, Ok(exit) if exit.success())
            && matches!(
                ollama_manager::detect_installation(),
                ollama_manager::InstallStatus::Installed { .. }
            )
        {
            ctx.log("AI runtime component installed successfully");
            return Ok(());
        }
    }

    #[cfg(target_os = "macos")]
    {
        let status = Command::new("brew").args(["install", "ollama"]).status();
        if matches!(status, Ok(exit) if exit.success()) {
            ctx.log("AI runtime component installed successfully");
            return Ok(());
        }
    }

    #[cfg(target_os = "linux")]
    {
        let status = Command::new("sh")
            .arg("-c")
            .arg("curl -fsSL https://ollama.com/install.sh | sh")
            .status();
        if matches!(status, Ok(exit) if exit.success()) {
            ctx.log("AI runtime component installed successfully");
            return Ok(());
        }
    }

    Err("Required component could not be initialized.".to_string())
}
