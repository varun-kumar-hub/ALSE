use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tokio::io::AsyncBufReadExt;
use tokio_util::io::StreamReader;

use super::{database_manager, installer, service_manager, workspace_manager};
use super::runtime_manager::RuntimeContext;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub os: String,
    pub cpu: String,
    pub ram_gb: u64,
    pub disk_free_gb: u64,
    pub gpu: Option<String>,
    pub recommended_profile: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StackComponent {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub size_gb: f64,
    pub required_disk_gb: f64,
    pub recommended: bool,
    pub selected: bool,
    pub installable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationPlan {
    pub hardware: HardwareProfile,
    pub profiles: Vec<InstallProfile>,
    pub components: Vec<StackComponent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub component_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallSelection {
    pub component_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentProgress {
    pub component_id: String,
    pub status: String,
    pub progress: u8,
    pub downloaded_bytes: Option<u64>,
    pub total_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StackInstallProgress {
    pub phase: String,
    pub label: String,
    pub overall_progress: u8,
    pub component: Option<ComponentProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StackInstallResult {
    pub ready: bool,
    pub installed_components: Vec<String>,
    pub workspace_path: String,
    pub diagnostics: Vec<String>,
}

#[tauri::command]
pub async fn get_local_ai_stack_plan() -> Result<InstallationPlan, String> {
    let hardware = detect_hardware_profile();
    let profiles = build_profiles();
    let mut components = build_components();
    let recommended_ids = profiles
        .iter()
        .find(|profile| profile.id == hardware.recommended_profile)
        .map(|profile| profile.component_ids.clone())
        .unwrap_or_default();

    for component in &mut components {
        component.recommended = recommended_ids.contains(&component.id);
        component.selected = component.recommended;
    }

    Ok(InstallationPlan {
        hardware,
        profiles,
        components,
    })
}

#[tauri::command]
pub async fn install_local_ai_stack(
    selection: InstallSelection,
    on_progress: Channel<StackInstallProgress>,
) -> Result<StackInstallResult, String> {
    let mut ctx = RuntimeContext::new();
    let components = build_components();
    let selected: Vec<StackComponent> = components
        .into_iter()
        .filter(|component| selection.component_ids.contains(&component.id))
        .collect();

    emit(&on_progress, "permission", "Preparing installer", 4, None);

    emit(&on_progress, "components", "Installing required components", 10, None);
    installer::repair_missing_components(&mut ctx).await?;

    emit(&on_progress, "runtime", "Preparing AI Runtime", 18, None);
    service_manager::ensure_ai_service(&mut ctx).await?;

    let model_components: Vec<StackComponent> = selected
        .iter()
        .filter(|component| component.installable && component.category != "workspace")
        .cloned()
        .collect();
    let total_models = model_components.len().max(1);

    for (index, component) in model_components.iter().enumerate() {
        let base_progress = 24 + ((index as f64 / total_models as f64) * 46.0) as u8;
        emit(
            &on_progress,
            "models",
            &format!("Downloading {}", component.name),
            base_progress,
            Some(ComponentProgress {
                component_id: component.id.clone(),
                status: "running".to_string(),
                progress: 0,
                downloaded_bytes: None,
                total_bytes: None,
            }),
        );
        pull_model(&component.id, component, &on_progress, base_progress).await?;
        ctx.models.push(component.id.clone());
    }

    emit(&on_progress, "workspace", "Creating Workspace", 74, None);
    workspace_manager::ensure_workspace(&mut ctx)?;

    emit(&on_progress, "database", "Initializing Database", 84, None);
    database_manager::ensure_database(&mut ctx)?;

    emit(&on_progress, "services", "Starting AI Services", 92, None);
    service_manager::ensure_ai_service(&mut ctx).await?;

    emit(&on_progress, "verify", "Verifying Installation", 98, None);
    workspace_manager::write_runtime_log(&ctx);

    emit(&on_progress, "complete", "Everything is ready", 100, None);

    Ok(StackInstallResult {
        ready: true,
        installed_components: selected.into_iter().map(|component| component.name).collect(),
        workspace_path: ctx.workspace_path.unwrap_or_default(),
        diagnostics: ctx.diagnostics,
    })
}

fn emit(
    channel: &Channel<StackInstallProgress>,
    phase: &str,
    label: &str,
    overall_progress: u8,
    component: Option<ComponentProgress>,
) {
    let _ = channel.send(StackInstallProgress {
        phase: phase.to_string(),
        label: label.to_string(),
        overall_progress,
        component,
    });
}

async fn pull_model(
    model_id: &str,
    component: &StackComponent,
    channel: &Channel<StackInstallProgress>,
    base_progress: u8,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client
        .post("http://127.0.0.1:11434/api/pull")
        .json(&serde_json::json!({ "name": model_id, "stream": true }))
        .send()
        .await
        .map_err(|e| format!("Unable to download selected model: {}", e))?;

    if !res.status().is_success() {
        return Err("Unable to download selected model.".to_string());
    }

    let stream = res
        .bytes_stream()
        .map(|item| item.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));
    let reader = StreamReader::new(stream);
    let mut lines = reader.lines();

    while let Ok(Some(line)) = lines.next_line().await {
        if line.contains("\"error\"") {
            return Err("Unable to download selected model.".to_string());
        }

        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) {
            let completed = value.get("completed").and_then(|item| item.as_u64());
            let total = value.get("total").and_then(|item| item.as_u64());
            let progress = match (completed, total) {
                (Some(done), Some(total_bytes)) if total_bytes > 0 => {
                    ((done as f64 / total_bytes as f64) * 100.0).round() as u8
                }
                _ => 0,
            };

            emit(
                channel,
                "models",
                &format!("Downloading {}", component.name),
                (base_progress + ((progress as f64 / 100.0) * 8.0) as u8).min(70),
                Some(ComponentProgress {
                    component_id: component.id.clone(),
                    status: value
                        .get("status")
                        .and_then(|item| item.as_str())
                        .unwrap_or("downloading")
                        .to_string(),
                    progress,
                    downloaded_bytes: completed,
                    total_bytes: total,
                }),
            );
        }
    }

    emit(
        channel,
        "models",
        &format!("Installed {}", component.name),
        base_progress.saturating_add(8).min(70),
        Some(ComponentProgress {
            component_id: component.id.clone(),
            status: "success".to_string(),
            progress: 100,
            downloaded_bytes: None,
            total_bytes: None,
        }),
    );

    Ok(())
}

fn detect_hardware_profile() -> HardwareProfile {
    let ram_gb = detect_ram_gb();
    let disk_free_gb = detect_disk_free_gb();
    let gpu = detect_gpu();
    let recommended_profile = if ram_gb < 16 {
        "minimal"
    } else if ram_gb <= 32 {
        "standard"
    } else {
        "research"
    };

    HardwareProfile {
        os: std::env::consts::OS.to_string(),
        cpu: detect_cpu(),
        ram_gb,
        disk_free_gb,
        gpu,
        recommended_profile: recommended_profile.to_string(),
    }
}

fn build_profiles() -> Vec<InstallProfile> {
    vec![
        InstallProfile {
            id: "minimal".to_string(),
            name: "Minimal".to_string(),
            description: "Core runtime, one fast language model, and embeddings.".to_string(),
            component_ids: vec!["qwen3:4b".to_string(), "nomic-embed-text".to_string(), "workspace".to_string()],
        },
        InstallProfile {
            id: "standard".to_string(),
            name: "Standard".to_string(),
            description: "Balanced setup for chat, coding, search, vision, and speech.".to_string(),
            component_ids: vec![
                "qwen3:8b".to_string(),
                "deepseek-coder:6.7b".to_string(),
                "bge-large".to_string(),
                "llava:7b".to_string(),
                "whisper-small".to_string(),
                "workspace".to_string(),
            ],
        },
        InstallProfile {
            id: "developer".to_string(),
            name: "Developer".to_string(),
            description: "Coding-focused stack with code generation and embeddings.".to_string(),
            component_ids: vec![
                "qwen3:8b".to_string(),
                "deepseek-coder:6.7b".to_string(),
                "codellama:7b".to_string(),
                "starcoder2:7b".to_string(),
                "nomic-embed-text".to_string(),
                "workspace".to_string(),
            ],
        },
        InstallProfile {
            id: "research".to_string(),
            name: "Research".to_string(),
            description: "Larger reasoning, document analysis, embeddings, vision, and speech.".to_string(),
            component_ids: vec![
                "qwen3:32b".to_string(),
                "deepseek-r1:32b".to_string(),
                "gemma3:12b".to_string(),
                "bge-large".to_string(),
                "llava:13b".to_string(),
                "whisper-medium".to_string(),
                "workspace".to_string(),
            ],
        },
    ]
}

fn build_components() -> Vec<StackComponent> {
    vec![
        component("qwen3:4b", "Qwen3 4B", "Small Models", "Fast general model for laptops.", 2.6, 5.2, true),
        component("gemma3:4b", "Gemma 3 4B", "Small Models", "Compact general assistant model.", 2.8, 5.6, true),
        component("llama3.2", "Llama 3.2 3B", "Small Models", "Small efficient baseline model.", 2.0, 4.0, true),
        component("qwen3:8b", "Qwen3 8B", "Medium Models", "Balanced general model for most users.", 5.2, 10.4, true),
        component("gemma3:12b", "Gemma 3 12B", "Medium Models", "Higher quality general responses.", 8.1, 16.2, true),
        component("llama3.1:8b", "Llama 3.1 8B", "Medium Models", "General assistant model.", 4.9, 9.8, true),
        component("deepseek-r1:8b", "DeepSeek R1 Distill 8B", "Medium Models", "Reasoning-oriented model.", 5.0, 10.0, true),
        component("qwen3:32b", "Qwen3 32B", "Large Models", "Large general reasoning model.", 20.0, 40.0, true),
        component("llama3.3:70b", "Llama 3.3 70B", "Large Models", "Large-capacity general model.", 43.0, 86.0, true),
        component("deepseek-r1:32b", "DeepSeek R1", "Large Models", "Advanced reasoning model.", 20.0, 40.0, true),
        component("mixtral", "Mixtral", "Large Models", "Large mixture-of-experts model.", 26.0, 52.0, true),
        component("qwen2.5-coder:7b", "Qwen Coder", "Coding Models", "Code-focused generation model.", 4.7, 9.4, true),
        component("deepseek-coder:6.7b", "DeepSeek Coder", "Coding Models", "Coding assistant model.", 3.8, 7.6, true),
        component("codellama:7b", "Code Llama", "Coding Models", "Code generation model.", 3.8, 7.6, true),
        component("starcoder2:7b", "StarCoder2", "Coding Models", "Code completion and generation.", 4.0, 8.0, true),
        component("nomic-embed-text", "nomic-embed-text", "Embedding Models", "Semantic search, memory, and RAG.", 0.3, 0.8, true),
        component("bge-large", "bge-large", "Embedding Models", "High quality embedding model.", 1.3, 2.6, true),
        component("bge-small", "bge-small", "Embedding Models", "Lightweight embedding model.", 0.2, 0.5, true),
        component("snowflake-arctic-embed", "Snowflake Embeddings", "Embedding Models", "General embedding model.", 0.7, 1.4, true),
        component("llava:7b", "LLaVA", "Vision Models", "Image understanding model.", 4.7, 9.4, true),
        component("llava:13b", "LLaVA 13B", "Vision Models", "Higher quality image understanding.", 8.0, 16.0, true),
        component("qwen2.5vl:7b", "Qwen VL", "Vision Models", "Vision language model.", 5.5, 11.0, true),
        component("whisper-small", "Whisper Small", "Speech Models", "Local speech transcription.", 0.5, 1.0, false),
        component("whisper-medium", "Whisper Medium", "Speech Models", "Higher quality speech transcription.", 1.5, 3.0, false),
        component("whisper-large", "Whisper Large", "Speech Models", "Best local speech transcription.", 3.0, 6.0, false),
        component("local-tts", "Local TTS Engine", "Text-to-Speech", "Local text-to-speech support.", 0.5, 1.0, false),
        component("workspace", "Workspace", "Workspace", "Workspace, database, cache, memory, downloads, projects, and exports.", 0.1, 1.0, false),
    ]
}

fn component(id: &str, name: &str, category: &str, description: &str, size_gb: f64, required_disk_gb: f64, installable: bool) -> StackComponent {
    StackComponent {
        id: id.to_string(),
        name: name.to_string(),
        category: category.to_string(),
        description: description.to_string(),
        size_gb,
        required_disk_gb,
        recommended: false,
        selected: false,
        installable,
    }
}

fn detect_ram_gb() -> u64 {
    #[cfg(target_os = "windows")]
    {
        if let Some(value) = powershell_number("(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory") {
            return (value / 1024 / 1024 / 1024).max(1);
        }
    }
    16
}

fn detect_disk_free_gb() -> u64 {
    #[cfg(target_os = "windows")]
    {
        if let Some(value) = powershell_number("(Get-PSDrive -Name $env:SystemDrive.TrimEnd(':')).Free") {
            return (value / 1024 / 1024 / 1024).max(1);
        }
    }
    64
}

fn detect_gpu() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Get-CimInstance Win32_VideoController | Select-Object -First 1 -ExpandProperty Name)",
            ])
            .output()
        {
            let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
}

fn detect_cpu() -> String {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)",
            ])
            .output()
        {
            let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !value.is_empty() {
                return value;
            }
        }
    }
    "CPU detected".to_string()
}

#[cfg(target_os = "windows")]
fn powershell_number(command: &str) -> Option<u64> {
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", command])
        .output()
        .ok()?;
    String::from_utf8_lossy(&output.stdout).trim().parse::<u64>().ok()
}
