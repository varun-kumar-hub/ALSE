use super::runtime_manager::RuntimeContext;
use futures_util::StreamExt;
use tokio::io::AsyncBufReadExt;
use tokio_util::io::StreamReader;

const DEFAULT_MODEL: &str = "llama3.2";

pub async fn ensure_default_models(ctx: &mut RuntimeContext) -> Result<(), String> {
    let client = reqwest::Client::new();
    let models = list_models(&client).await?;

    if models.iter().any(|model| model == DEFAULT_MODEL) {
        ctx.models = models;
        ctx.log(format!("Default AI model available: {}", DEFAULT_MODEL));
        return Ok(());
    }

    ctx.log(format!("Default AI model missing; downloading {}", DEFAULT_MODEL));
    pull_model(&client, DEFAULT_MODEL).await?;
    ctx.models = list_models(&client).await?;
    Ok(())
}

async fn list_models(client: &reqwest::Client) -> Result<Vec<String>, String> {
    let res = client
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Unable to inspect local models: {}", e))?;

    let value: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Unable to parse local model inventory: {}", e))?;

    Ok(value
        .get("models")
        .and_then(|models| models.as_array())
        .map(|models| {
            models
                .iter()
                .filter_map(|item| item.get("name").and_then(|name| name.as_str()))
                .map(ToString::to_string)
                .collect()
        })
        .unwrap_or_default())
}

async fn pull_model(client: &reqwest::Client, model: &str) -> Result<(), String> {
    let res = client
        .post("http://127.0.0.1:11434/api/pull")
        .json(&serde_json::json!({ "name": model, "stream": true }))
        .send()
        .await
        .map_err(|e| format!("Unable to download AI model: {}", e))?;

    if !res.status().is_success() {
        return Err("Unable to download AI model.".to_string());
    }

    let stream = res
        .bytes_stream()
        .map(|item| item.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));
    let reader = StreamReader::new(stream);
    let mut lines = reader.lines();

    while let Ok(Some(line)) = lines.next_line().await {
        if line.contains("\"error\"") {
            return Err("Unable to download AI model.".to_string());
        }
    }

    Ok(())
}
