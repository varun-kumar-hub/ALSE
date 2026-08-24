use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use futures_util::StreamExt;
use tokio::io::AsyncBufReadExt;
use tokio_util::io::StreamReader;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudValidationResult {
    pub connected: bool,
    pub models: Vec<String>,
    pub status_code: u16,
    pub error_category: String,
    pub message: String,
    pub latency_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudStreamChunk {
    pub done: bool,
    pub content: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn verify_cloud_provider(
    provider_id: String,
    endpoint: String,
    api_key: String,
    auth_header_name: Option<String>,
    custom_headers: Option<HashMap<String, String>>,
) -> Result<CloudValidationResult, String> {
    let start_time = std::time::Instant::now();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&endpoint);

    let header_name = auth_header_name.unwrap_or_else(|| "Authorization".to_string());
    let header_val = if header_name == "Authorization" && !api_key.starts_with("Bearer ") {
        format!("Bearer {}", api_key.trim())
    } else {
        api_key.trim().to_string()
    };

    req = req.header(&header_name, header_val);

    if let Some(extra_headers) = custom_headers {
        for (k, v) in extra_headers {
            req = req.header(k, v);
        }
    }

    match req.send().await {
        Ok(res) => {
            let status = res.status().as_u16();
            let latency_ms = start_time.elapsed().as_millis() as u64;

            if res.status().is_success() {
                let json_text = res.text().await.unwrap_or_default();
                let mut discovered_models = Vec::new();

                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_text) {
                    if let Some(data_arr) = val.get("data").and_then(|d| d.as_array()) {
                        for item in data_arr {
                            if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                                discovered_models.push(id.to_string());
                            }
                        }
                    } else if let Some(models_arr) = val.get("models").and_then(|m| m.as_array()) {
                        for item in models_arr {
                            if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                                discovered_models.push(name.replace("models/", ""));
                            } else if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                                discovered_models.push(id.to_string());
                            }
                        }
                    }
                }

                Ok(CloudValidationResult {
                    connected: true,
                    models: discovered_models,
                    status_code: status,
                    error_category: "None".to_string(),
                    message: format!("Successfully authenticated with {} (HTTP 200).", provider_id),
                    latency_ms,
                })
            } else {
                let error_text = res.text().await.unwrap_or_default();
                let (error_category, msg) = match status {
                    401 => ("Authentication Failed", "HTTP 401 Unauthorized: Invalid API Key."),
                    403 => ("Authentication Failed", "HTTP 403 Forbidden: Invalid permissions or API Key."),
                    404 => ("Endpoint Failed", "HTTP 404 Not Found: Invalid API models endpoint."),
                    429 => ("Rate Limit Exceeded", "HTTP 429 Too Many Requests: Rate limit exceeded."),
                    _ => ("Provider Error", "Cloud provider returned error response."),
                };

                Ok(CloudValidationResult {
                    connected: false,
                    models: Vec::new(),
                    status_code: status,
                    error_category: error_category.to_string(),
                    message: format!("{} ({})", msg, error_text.chars().take(120).collect::<String>()),
                    latency_ms,
                })
            }
        }
        Err(err) => {
            let latency_ms = start_time.elapsed().as_millis() as u64;
            Ok(CloudValidationResult {
                connected: false,
                models: Vec::new(),
                status_code: 0,
                error_category: "Network Error".to_string(),
                message: format!("Connection failed: {}", err),
                latency_ms,
            })
        }
    }
}

#[tauri::command]
pub async fn cloud_chat_stream(
    endpoint: String,
    model: String,
    api_key: String,
    messages: Vec<CloudChatMessage>,
    on_chunk: Channel<CloudStreamChunk>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let auth_val = if !api_key.starts_with("Bearer ") {
        format!("Bearer {}", api_key.trim())
    } else {
        api_key.trim().to_string()
    };

    let payload = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true
    });

    let res = client
        .post(&endpoint)
        .header("Authorization", auth_val)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Cloud request network error: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        let _ = on_chunk.send(CloudStreamChunk {
            done: true,
            content: None,
            error: Some(format!("Cloud API HTTP {}: {}", res.status(), err_text.chars().take(200).collect::<String>())),
        });
        return Ok(());
    }

    let stream = res
        .bytes_stream()
        .map(|item| item.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));

    let reader = StreamReader::new(stream);
    let mut lines = reader.lines();

    while let Ok(Some(line)) = lines.next_line().await {
        let trimmed = line.trim();
        if trimmed.starts_with("data: ") {
            let data_str = &trimmed[6..];
            if data_str == "[DONE]" {
                let _ = on_chunk.send(CloudStreamChunk {
                    done: true,
                    content: None,
                    error: None,
                });
                return Ok(());
            }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data_str) {
                if let Some(chunk_text) = json["choices"][0]["delta"]["content"].as_str() {
                    let _ = on_chunk.send(CloudStreamChunk {
                        done: false,
                        content: Some(chunk_text.to_string()),
                        error: None,
                    });
                }
            }
        }
    }

    let _ = on_chunk.send(CloudStreamChunk {
        done: true,
        content: None,
        error: None,
    });

    Ok(())
}
