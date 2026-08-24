mod commands;
mod models;
mod runtime;
mod services;

use commands::cloud::*;
use commands::export::*;
use commands::ollama::*;
use commands::setup::*;
use commands::workspace::*;
use runtime::runtime_manager::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            check_ollama_installation,
            check_ollama_running,
            start_ollama_server,
            initialize_backend,
            list_models,
            chat_stream,
            generate_chat_title,
            pull_model_stream,
            get_default_workspace_path,
            init_workspace,
            save_workspace_file,
            get_system_info,
            run_setup_diagnostics,
            export_chat_markdown,
            prepare_runtime,
            verify_cloud_provider,
            cloud_chat_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nexus Agent application");
}
