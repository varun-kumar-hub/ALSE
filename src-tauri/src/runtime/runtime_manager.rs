use super::{
    database_manager, dependency_manager, health_manager, installer, model_manager, package_manager,
    service_manager, updater, workspace_manager,
};
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeProgress {
    pub step: String,
    pub label: String,
    pub status: String,
    pub progress: u8,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeResult {
    pub ready: bool,
    pub workspace_path: String,
    pub models: Vec<String>,
    pub diagnostics: Vec<String>,
}

pub struct RuntimeContext {
    pub diagnostics: Vec<String>,
    pub workspace_path: Option<String>,
    pub models: Vec<String>,
}

impl RuntimeContext {
    pub fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
            workspace_path: None,
            models: Vec::new(),
        }
    }

    pub fn log(&mut self, message: impl Into<String>) {
        self.diagnostics.push(message.into());
    }
}

#[tauri::command]
pub async fn prepare_runtime(on_progress: Channel<RuntimeProgress>) -> Result<RuntimeResult, String> {
    let mut ctx = RuntimeContext::new();

    emit(&on_progress, "system", "Checking System", "running", 5, None);
    dependency_manager::verify_system(&mut ctx).await?;
    emit(&on_progress, "system", "Checking System", "success", 12, None);

    emit(
        &on_progress,
        "components",
        "Installing Required Components",
        "running",
        20,
        None,
    );
    installer::repair_missing_components(&mut ctx).await?;
    package_manager::verify_packages(&mut ctx).await?;
    updater::check_runtime_updates(&mut ctx).await?;
    emit(
        &on_progress,
        "components",
        "Installing Required Components",
        "success",
        32,
        None,
    );

    emit(&on_progress, "runtime", "Preparing AI Runtime", "running", 40, None);
    service_manager::ensure_ai_service(&mut ctx).await?;
    emit(&on_progress, "runtime", "Preparing AI Runtime", "success", 48, None);

    emit(&on_progress, "models", "Downloading AI Models", "running", 56, None);
    model_manager::ensure_default_models(&mut ctx).await?;
    emit(&on_progress, "models", "Downloading AI Models", "success", 68, None);

    emit(&on_progress, "workspace", "Creating Workspace", "running", 74, None);
    workspace_manager::ensure_workspace(&mut ctx)?;
    emit(&on_progress, "workspace", "Creating Workspace", "success", 80, None);

    emit(&on_progress, "database", "Initializing Database", "running", 84, None);
    database_manager::ensure_database(&mut ctx)?;
    emit(&on_progress, "database", "Initializing Database", "success", 88, None);

    emit(&on_progress, "services", "Starting AI Services", "running", 92, None);
    service_manager::ensure_ai_service(&mut ctx).await?;
    emit(&on_progress, "services", "Starting AI Services", "success", 95, None);

    emit(&on_progress, "health", "Final Verification", "running", 98, None);
    health_manager::verify_runtime_health(&mut ctx).await?;
    emit(&on_progress, "health", "Ready", "success", 100, None);

    workspace_manager::write_runtime_log(&ctx);

    Ok(RuntimeResult {
        ready: true,
        workspace_path: ctx.workspace_path.unwrap_or_default(),
        models: ctx.models,
        diagnostics: ctx.diagnostics,
    })
}

fn emit(
    channel: &Channel<RuntimeProgress>,
    step: &str,
    label: &str,
    status: &str,
    progress: u8,
    detail: Option<String>,
) {
    let _ = channel.send(RuntimeProgress {
        step: step.to_string(),
        label: label.to_string(),
        status: status.to_string(),
        progress,
        detail,
    });
}
