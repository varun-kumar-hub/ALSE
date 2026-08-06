use super::runtime_manager::RuntimeContext;
use std::fs;
use std::path::Path;

pub fn ensure_database(ctx: &mut RuntimeContext) -> Result<(), String> {
    let workspace = ctx
        .workspace_path
        .as_ref()
        .ok_or_else(|| "Workspace must be prepared before database initialization".to_string())?;

    let database_dir = Path::new(workspace).join("database");
    fs::create_dir_all(&database_dir)
        .map_err(|e| format!("Unable to prepare local database directory: {}", e))?;

    let schema_path = database_dir.join("schema.sql");
    fs::write(
        schema_path,
        r#"CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  context_summary TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  intent TEXT,
  created_at TEXT NOT NULL,
  tokens_used INTEGER,
  generation_time_ms INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
"#,
    )
    .map_err(|e| format!("Unable to prepare database schema: {}", e))?;

    ctx.log("Database schema prepared");
    Ok(())
}
