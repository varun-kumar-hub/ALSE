use super::runtime_manager::RuntimeContext;
use crate::services::ollama_manager;

pub async fn ensure_ai_service(ctx: &mut RuntimeContext) -> Result<(), String> {
    let startup = ollama_manager::ensure_running().await;
    if startup.running {
        ctx.log(if startup.started_by_us {
            "AI service started by Runtime Manager"
        } else {
            "AI service already running"
        });
        Ok(())
    } else {
        Err(startup
            .error
            .unwrap_or_else(|| "Required component could not be initialized.".to_string()))
    }
}
