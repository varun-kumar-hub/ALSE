use super::runtime_manager::RuntimeContext;
use crate::services::ollama_manager;

pub async fn verify_runtime_health(ctx: &mut RuntimeContext) -> Result<(), String> {
    if !ollama_manager::health_check().await {
        return Err("Required component could not be initialized.".to_string());
    }

    if ctx.models.is_empty() {
        return Err("AI models could not be prepared.".to_string());
    }

    ctx.log("Runtime health checks passed");
    Ok(())
}
