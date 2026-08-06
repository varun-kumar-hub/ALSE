use crate::models::ollama::*;
use crate::services::ollama_manager;
use futures_util::StreamExt;
use tauri::ipc::Channel;
use tokio::io::AsyncBufReadExt;
use tokio_util::io::StreamReader;

/// Check Ollama installation status
#[tauri::command]
pub fn check_ollama_installation() -> ollama_manager::InstallStatus {
    ollama_manager::detect_installation()
}

/// Check if Ollama server is running
#[tauri::command]
pub async fn check_ollama_running() -> ollama_manager::ServerStatus {
    ollama_manager::check_server_running().await
}

/// Start Ollama server in background
#[tauri::command]
pub async fn start_ollama_server() -> Result<(), String> {
    let path = ollama_manager::get_ollama_path()
        .ok_or_else(|| "Ollama is not installed on this system".to_string())?;
    ollama_manager::start_server(&path)?;
    ollama_manager::wait_until_ready().await
}

/// Perform full startup check and initialization sequence
#[tauri::command]
pub async fn initialize_backend() -> ollama_manager::StartupResult {
    ollama_manager::ensure_running().await
}

/// List available local Ollama models
#[tauri::command]
pub async fn list_models() -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Failed to reach Ollama API: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama API returned HTTP {}", res.status()));
    }

    let tags_resp: OllamaTagsResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse models response: {}", e))?;

    let models = tags_resp
        .models
        .unwrap_or_default()
        .into_iter()
        .map(|m| OllamaModel {
            name: m.name,
            size: m.size,
            digest: m.digest,
            modified_at: m.modified_at,
            details: m.details,
        })
        .collect();

    Ok(models)
}

/// Stream chat completion token by token over a Tauri channel
#[tauri::command]
pub async fn chat_stream(
    model: String,
    messages: Vec<ChatMessage>,
    on_chunk: Channel<ChatStreamChunk>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let req_body = ChatRequest {
        model,
        messages,
        stream: true,
    };

    let res = client
        .post("http://127.0.0.1:11434/api/chat")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send chat request: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Ollama chat error: {}", err_text));
    }

    let stream = res
        .bytes_stream()
        .map(|item| item.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));

    let reader = StreamReader::new(stream);
    let mut lines = reader.lines();

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(chunk) = serde_json::from_str::<ChatStreamChunk>(&line) {
            let _ = on_chunk.send(chunk);
        }
    }

    Ok(())
}

/// Generate title for a new chat based on initial message
#[tauri::command]
pub async fn generate_chat_title(model: String, prompt: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let title_prompt = format!(
        "Summarize the following user request into a concise 3-6 word title. Do not use quotes or punctuation.\n\nUser request: {}",
        prompt
    );

    let req_body = GenerateRequest {
        model,
        prompt: title_prompt,
        stream: false,
    };

    let res = client
        .post("http://127.0.0.1:11434/api/generate")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Failed to request title: {}", e))?;

    if !res.status().is_success() {
        return Ok("New Chat".to_string());
    }

    let gen_resp: GenerateResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse title response: {}", e))?;

    let clean_title = gen_resp
        .response
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .to_string();

    if clean_title.is_empty() {
        Ok("New Chat".to_string())
    } else {
        Ok(clean_title)
    }
}

/// Stream model pull progress over a Tauri channel
#[tauri::command]
pub async fn pull_model_stream(
    model_name: String,
    on_progress: Channel<PullProgressChunk>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let req_body = PullRequest {
        name: model_name,
        stream: true,
    };

    let res = client
        .post("http://127.0.0.1:11434/api/pull")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Failed to start model pull: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Pull failed: {}", err_text));
    }

    let stream = res
        .bytes_stream()
        .map(|item| item.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));

    let reader = StreamReader::new(stream);
    let mut lines = reader.lines();

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(chunk) = serde_json::from_str::<PullProgressChunk>(&line) {
            let _ = on_progress.send(chunk);
        }
    }

    Ok(())
}
