use super::runtime_manager::RuntimeContext;

pub async fn check_runtime_updates(ctx: &mut RuntimeContext) -> Result<(), String> {
    ctx.log("Runtime update channel reserved for future releases");
    Ok(())
}
