use std::process::Command;
use std::time::Duration;
use tokio::time::sleep;

/// The OllamaManager handles the full lifecycle of the Ollama service:
/// detection, startup, health checking, and graceful shutdown.
///
/// Design: All network calls to Ollama go through the Rust backend.
/// The frontend never talks to Ollama directly — this avoids CORS
/// issues and keeps all network activity sandboxed.

const OLLAMA_API_BASE: &str = "http://127.0.0.1:11434";
const HEALTH_CHECK_TIMEOUT_MS: u64 = 2000;
const STARTUP_POLL_INTERVAL_MS: u64 = 500;
const MAX_STARTUP_WAIT_SECS: u64 = 30;

/// Result of an Ollama installation check
#[derive(Debug, Clone, serde::Serialize)]
pub enum InstallStatus {
    Installed { path: String },
    NotInstalled,
}

/// Result of an Ollama server readiness check
#[derive(Debug, Clone, serde::Serialize)]
pub enum ServerStatus {
    Running,
    NotRunning,
    Error(String),
}

/// Combined startup result
#[derive(Debug, Clone, serde::Serialize)]
pub struct StartupResult {
    pub installed: bool,
    pub running: bool,
    pub started_by_us: bool,
    pub error: Option<String>,
}

/// Detect whether the `ollama` executable is available on the system.
///
/// On Windows, checks common install paths and PATH.
pub fn detect_installation() -> InstallStatus {
    // Try PATH first
    if let Ok(output) = Command::new("ollama").arg("--version").output() {
        if output.status.success() {
            return InstallStatus::Installed {
                path: "ollama".to_string(),
            };
        }
    }

    // Check common Windows install locations
    #[cfg(target_os = "windows")]
    {
        let common_paths = [
            format!(
                "{}\\Programs\\Ollama\\ollama.exe",
                std::env::var("LOCALAPPDATA").unwrap_or_default()
            ),
            format!(
                "{}\\Ollama\\ollama.exe",
                std::env::var("PROGRAMFILES").unwrap_or_default()
            ),
            format!(
                "{}\\Ollama\\ollama.exe",
                std::env::var("USERPROFILE").unwrap_or_default()
            ),
        ];

        for path in &common_paths {
            if std::path::Path::new(path).exists() {
                return InstallStatus::Installed {
                    path: path.clone(),
                };
            }
        }
    }

    // Check common macOS / Linux locations
    #[cfg(not(target_os = "windows"))]
    {
        let common_paths = ["/usr/local/bin/ollama", "/usr/bin/ollama"];
        for path in &common_paths {
            if std::path::Path::new(path).exists() {
                return InstallStatus::Installed {
                    path: path.to_string(),
                };
            }
        }
    }

    InstallStatus::NotInstalled
}

/// Get the path to the Ollama executable, if installed.
pub fn get_ollama_path() -> Option<String> {
    match detect_installation() {
        InstallStatus::Installed { path } => Some(path),
        InstallStatus::NotInstalled => None,
    }
}

/// Check if the Ollama API server is currently responding.
pub async fn check_server_running() -> ServerStatus {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(HEALTH_CHECK_TIMEOUT_MS))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => return ServerStatus::Error(format!("HTTP client error: {}", e)),
    };

    match client.get(format!("{}/api/tags", OLLAMA_API_BASE)).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                ServerStatus::Running
            } else {
                ServerStatus::NotRunning
            }
        }
        Err(_) => ServerStatus::NotRunning,
    }
}

/// Start the Ollama server process silently in the background.
///
/// On Windows, uses CREATE_NO_WINDOW to prevent a console window from appearing.
/// Returns Ok(()) if the process was launched (does NOT wait for readiness).
pub fn start_server(ollama_path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        Command::new(ollama_path)
            .arg("serve")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to start Ollama: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new(ollama_path)
            .arg("serve")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start Ollama: {}", e))?;
    }

    Ok(())
}

/// Wait until the Ollama API server becomes responsive.
///
/// Polls the health endpoint every STARTUP_POLL_INTERVAL_MS until
/// it responds or MAX_STARTUP_WAIT_SECS is exceeded.
pub async fn wait_until_ready() -> Result<(), String> {
    let max_attempts = (MAX_STARTUP_WAIT_SECS * 1000) / STARTUP_POLL_INTERVAL_MS;

    for attempt in 0..max_attempts {
        if let ServerStatus::Running = check_server_running().await {
            log::info!(
                "Ollama server ready after {} attempts (~{}ms)",
                attempt + 1,
                (attempt + 1) * STARTUP_POLL_INTERVAL_MS
            );
            return Ok(());
        }
        sleep(Duration::from_millis(STARTUP_POLL_INTERVAL_MS)).await;
    }

    Err(format!(
        "Ollama server did not become ready within {} seconds",
        MAX_STARTUP_WAIT_SECS
    ))
}

/// Full startup sequence: detect → check running → start if needed → wait for ready.
///
/// This is the primary entry point called during app initialization.
pub async fn ensure_running() -> StartupResult {
    // Step 1: Check installation
    let ollama_path = match detect_installation() {
        InstallStatus::Installed { path } => path,
        InstallStatus::NotInstalled => {
            return StartupResult {
                installed: false,
                running: false,
                started_by_us: false,
                error: Some("Ollama is not installed".to_string()),
            };
        }
    };

    // Step 2: Check if already running
    if let ServerStatus::Running = check_server_running().await {
        log::info!("Ollama server is already running");
        return StartupResult {
            installed: true,
            running: true,
            started_by_us: false,
            error: None,
        };
    }

    // Step 3: Start the server
    log::info!("Starting Ollama server from: {}", ollama_path);
    if let Err(e) = start_server(&ollama_path) {
        return StartupResult {
            installed: true,
            running: false,
            started_by_us: false,
            error: Some(e),
        };
    }

    // Step 4: Wait until ready
    match wait_until_ready().await {
        Ok(()) => StartupResult {
            installed: true,
            running: true,
            started_by_us: true,
            error: None,
        },
        Err(e) => StartupResult {
            installed: true,
            running: false,
            started_by_us: true,
            error: Some(e),
        },
    }
}

/// Perform a health check — used for periodic monitoring.
pub async fn health_check() -> bool {
    matches!(check_server_running().await, ServerStatus::Running)
}
