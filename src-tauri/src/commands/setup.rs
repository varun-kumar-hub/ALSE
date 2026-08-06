use crate::models::ollama::{StartupCheckResult, SystemInfo};
use crate::services::ollama_manager;
use std::process::Command;
use std::time::Duration;

/// Fetch basic system info
#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: sys_info_hostname(),
    }
}

fn sys_info_hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "localhost".to_string())
}

/// Run detailed diagnostic checks for the Setup Wizard
#[tauri::command]
pub async fn run_setup_diagnostics() -> Vec<StartupCheckResult> {
    let mut results = Vec::new();

    // 1. Operating System
    results.push(StartupCheckResult {
        step: "os".to_string(),
        status: "success".to_string(),
        message: format!("OS: {} ({})", std::env::consts::OS, std::env::consts::ARCH),
    });

    // 2. Node.js check
    let node_status = Command::new("node").arg("--version").output();
    match node_status {
        Ok(out) if out.status.success() => {
            let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
            results.push(StartupCheckResult {
                step: "node".to_string(),
                status: "success".to_string(),
                message: format!("Node.js detected ({})", ver),
            });
        }
        _ => {
            results.push(StartupCheckResult {
                step: "node".to_string(),
                status: "warning".to_string(),
                message: "Node.js not detected in PATH (optional for desktop mode)".to_string(),
            });
        }
    };

    // 3. Git check
    let package_manager = detect_package_manager();
    results.push(StartupCheckResult {
        step: "package_manager".to_string(),
        status: if package_manager.is_some() { "success" } else { "warning" }.to_string(),
        message: package_manager.unwrap_or_else(|| {
            "No npm-compatible package manager detected in PATH".to_string()
        }),
    });

    // 4. Git check
    let git_status = Command::new("git").arg("--version").output();
    match git_status {
        Ok(out) if out.status.success() => {
            let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
            results.push(StartupCheckResult {
                step: "git".to_string(),
                status: "success".to_string(),
                message: format!("Git detected ({})", ver),
            });
        }
        _ => {
            results.push(StartupCheckResult {
                step: "git".to_string(),
                status: "warning".to_string(),
                message: "Git not detected in PATH".to_string(),
            });
        }
    };

    // 5. Internet check for optional model downloads
    results.push(check_internet().await);

    // 6. Ollama installation check
    match ollama_manager::detect_installation() {
        ollama_manager::InstallStatus::Installed { path } => {
            results.push(StartupCheckResult {
                step: "ollama_install".to_string(),
                status: "success".to_string(),
                message: format!("Ollama installed ({})", path),
            });
        }
        ollama_manager::InstallStatus::NotInstalled => {
            results.push(StartupCheckResult {
                step: "ollama_install".to_string(),
                status: "error".to_string(),
                message: "Ollama executable not found".to_string(),
            });
        }
    }

    // 7. Ollama server running check
    match ollama_manager::check_server_running().await {
        ollama_manager::ServerStatus::Running => {
            results.push(StartupCheckResult {
                step: "ollama_server".to_string(),
                status: "success".to_string(),
                message: "Ollama API server is running on http://127.0.0.1:11434".to_string(),
            });
        }
        _ => {
            results.push(StartupCheckResult {
                step: "ollama_server".to_string(),
                status: "pending".to_string(),
                message: "Ollama server not currently responding (will auto-start)".to_string(),
            });
        }
    }

    results
}

fn detect_package_manager() -> Option<String> {
    for manager in ["pnpm", "npm", "yarn"] {
        if let Ok(out) = Command::new(manager).arg("--version").output() {
            if out.status.success() {
                let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
                return Some(format!("{} detected ({})", manager, ver));
            }
        }
    }

    None
}

async fn check_internet() -> StartupCheckResult {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            return StartupCheckResult {
                step: "internet".to_string(),
                status: "warning".to_string(),
                message: format!("Could not create network client: {}", e),
            };
        }
    };

    match client.get("https://ollama.com").send().await {
        Ok(resp) if resp.status().is_success() => StartupCheckResult {
            step: "internet".to_string(),
            status: "success".to_string(),
            message: "Internet connection available for optional model downloads".to_string(),
        },
        Ok(resp) => StartupCheckResult {
            step: "internet".to_string(),
            status: "warning".to_string(),
            message: format!("Internet check returned HTTP {}", resp.status()),
        },
        Err(_) => StartupCheckResult {
            step: "internet".to_string(),
            status: "warning".to_string(),
            message: "Internet unavailable; existing local models can still be used".to_string(),
        },
    }
}
