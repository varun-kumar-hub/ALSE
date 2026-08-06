use super::runtime_manager::RuntimeContext;
use std::process::Command;

pub async fn verify_packages(ctx: &mut RuntimeContext) -> Result<(), String> {
    for manager in ["pnpm", "npm", "yarn"] {
        if let Ok(out) = Command::new(manager).arg("--version").output() {
            if out.status.success() {
                ctx.log(format!(
                    "Package manager available: {} {}",
                    manager,
                    String::from_utf8_lossy(&out.stdout).trim()
                ));
                return Ok(());
            }
        }
    }

    ctx.log("No development package manager detected; desktop runtime can continue");
    Ok(())
}
