use serde::{Deserialize, Serialize};

/// Status of the Ollama service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OllamaStatus {
    NotInstalled,
    Installed,
    Running,
    Starting,
    Error(String),
}

/// A single model available in Ollama
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: Option<u64>,
    pub digest: Option<String>,
    pub modified_at: Option<String>,
    pub details: Option<ModelDetails>,
}

/// Model detail metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelDetails {
    pub format: Option<String>,
    pub family: Option<String>,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
}

/// Response from Ollama /api/tags
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaTagsResponse {
    pub models: Option<Vec<OllamaTagModel>>,
}

/// Individual model in tags response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaTagModel {
    pub name: String,
    pub size: Option<u64>,
    pub digest: Option<String>,
    pub modified_at: Option<String>,
    pub details: Option<ModelDetails>,
}

/// Chat message for Ollama API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Request body for Ollama /api/chat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
}

/// A single streaming chunk from Ollama /api/chat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamChunk {
    pub model: Option<String>,
    pub message: Option<ChatMessage>,
    pub done: bool,
    pub total_duration: Option<u64>,
    pub eval_count: Option<u64>,
    pub eval_duration: Option<u64>,
}

/// Request body for Ollama /api/generate (used for title generation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
}

/// Response from Ollama /api/generate (non-streaming)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateResponse {
    pub response: String,
    pub done: bool,
    pub total_duration: Option<u64>,
}

/// Pull model request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequest {
    pub name: String,
    pub stream: bool,
}

/// Pull model progress chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullProgressChunk {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}

/// Startup check result sent to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupCheckResult {
    pub step: String,
    pub status: String, // "pending" | "running" | "success" | "error"
    pub message: String,
}

/// System information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub hostname: String,
}
