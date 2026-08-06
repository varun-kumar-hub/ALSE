use super::runtime_manager::RuntimeContext;
use std::process::Command;

pub async fn verify_system(ctx: &mut RuntimeContext) -> Result<(), String> {
    ctx.log(format!(
        "System: {} {}",
        std::env::consts::OS,
        std::env::consts::ARCH
    ));

    if let Ok(out) = Command::new("node").arg("--version").output() {
        if out.status.success() {
            ctx.log(format!(
                "Development runtime detected: {}",
                String::from_utf8_lossy(&out.stdout).trim()
            ));
        }
    }

    Ok(())
}
