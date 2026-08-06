import Database from '@tauri-apps/plugin-sql';
import { Chat, ChatMessage, AppSettings } from './types';

let dbInstance: Database | null = null;
let isFallbackMode = false;

// Fallback in-memory / localStorage store for web/dev preview
const localStorageFallback = {
  getChats(): Chat[] {
    const raw = localStorage.getItem('ai_os_chats');
    return raw ? JSON.parse(raw) : [];
  },
  saveChats(chats: Chat[]) {
    localStorage.setItem('ai_os_chats', JSON.stringify(chats));
  },
  getMessages(chatId: string): ChatMessage[] {
    const raw = localStorage.getItem(`ai_os_msg_${chatId}`);
    return raw ? JSON.parse(raw) : [];
  },
  saveMessages(chatId: string, msgs: ChatMessage[]) {
    localStorage.setItem(`ai_os_msg_${chatId}`, JSON.stringify(msgs));
  },
  getSetting(key: string, defaultVal: string): string {
    return localStorage.getItem(`ai_os_setting_${key}`) ?? defaultVal;
  },
  setSetting(key: string, val: string) {
    localStorage.setItem(`ai_os_setting_${key}`, val);
  },
};

/**
 * Initialize SQLite database connection and run schema migrations.
 */
export async function initDatabase(): Promise<Database | null> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await Database.load('sqlite:ai_os.db');
    await runMigrations(dbInstance);
    return dbInstance;
  } catch (err) {
    console.warn('SQLite plugin unavailable, falling back to local persistence:', err);
    isFallbackMode = true;
    return null;
  }
}

async function runMigrations(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      pinned INTEGER NOT NULL DEFAULT 0,
      model TEXT,
      context_summary TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      intent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      tokens_used INTEGER,
      generation_time_ms INTEGER,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );
  `);

  await addColumnIfMissing(db, 'messages', 'intent', 'TEXT');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);`);
}

async function addColumnIfMissing(db: Database, table: string, column: string, definition: string) {
  const columns = await db.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/* ================= Chats CRUD ================= */

export async function getChats(): Promise<Chat[]> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    return localStorageFallback.getChats().sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  const rows = await db.select<Chat[]>(
    `SELECT id, title, created_at, updated_at, pinned = 1 as pinned, model, context_summary FROM chats ORDER BY pinned DESC, updated_at DESC`
  );
  return rows;
}

export async function createChat(title = 'New Chat', model?: string): Promise<Chat> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newChat: Chat = {
    id,
    title,
    created_at: now,
    updated_at: now,
    pinned: false,
    model,
  };

  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats();
    chats.unshift(newChat);
    localStorageFallback.saveChats(chats);
    return newChat;
  }

  await db.execute(
    `INSERT INTO chats (id, title, created_at, updated_at, pinned, model) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, title, now, now, 0, model ?? null]
  );

  return newChat;
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats();
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.title = title;
      chat.updated_at = now;
      localStorageFallback.saveChats(chats);
    }
    return;
  }

  await db.execute(
    `UPDATE chats SET title = $1, updated_at = $2 WHERE id = $3`,
    [title, now, id]
  );
}

export async function togglePinChat(id: string, pinned: boolean): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats();
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.pinned = pinned;
      localStorageFallback.saveChats(chats);
    }
    return;
  }

  await db.execute(`UPDATE chats SET pinned = $1 WHERE id = $2`, [pinned ? 1 : 0, id]);
}

export async function deleteChat(id: string): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats().filter((c) => c.id !== id);
    localStorageFallback.saveChats(chats);
    localStorage.removeItem(`ai_os_msg_${id}`);
    return;
  }

  await db.execute(`DELETE FROM messages WHERE chat_id = $1`, [id]);
  await db.execute(`DELETE FROM chats WHERE id = $1`, [id]);
}

/* ================= Messages CRUD ================= */

export async function getMessages(chatId: string): Promise<ChatMessage[]> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    return localStorageFallback.getMessages(chatId);
  }

  return await db.select<ChatMessage[]>(
    `SELECT id, chat_id, role, content, intent, created_at, tokens_used, generation_time_ms FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
    [chatId]
  );
}

export async function addMessage(
  chatId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  intent?: ChatMessage['intent']
): Promise<ChatMessage> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const msg: ChatMessage = {
    id,
    chat_id: chatId,
    role,
    content,
    intent,
    created_at: now,
  };

  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const msgs = localStorageFallback.getMessages(chatId);
    msgs.push(msg);
    localStorageFallback.saveMessages(chatId, msgs);

    const chats = localStorageFallback.getChats();
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      chat.updated_at = now;
      localStorageFallback.saveChats(chats);
    }
    return msg;
  }

  await db.execute(
    `INSERT INTO messages (id, chat_id, role, content, intent, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, chatId, role, content, intent ?? null, now]
  );

  await db.execute(`UPDATE chats SET updated_at = $1 WHERE id = $2`, [now, chatId]);

  return msg;
}

/* ================= Settings CRUD ================= */

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    return localStorageFallback.getSetting(key, defaultValue);
  }

  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM settings WHERE key = $1`,
    [key]
  );
  return rows.length > 0 ? rows[0].value : defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    localStorageFallback.setSetting(key, value);
    return;
  }

  await db.execute(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
}

export async function getAllSettings(): Promise<AppSettings> {
  const assistantName = await getSetting('assistantName', 'AI OS');
  const theme = (await getSetting('theme', 'dark')) as AppSettings['theme'];
  const defaultModel = await getSetting('defaultModel', 'llama3.2');
  const workspaceLocation = await getSetting('workspaceLocation', '');
  const responseStyle = (await getSetting('responseStyle', 'adaptive')) as AppSettings['responseStyle'];
  const autoStartOllama = (await getSetting('autoStartOllama', 'true')) === 'true';
  const keepOllamaRunning = (await getSetting('keepOllamaRunning', 'true')) === 'true';
  const onboardingComplete = (await getSetting('onboardingComplete', 'false')) === 'true';

  return {
    assistantName,
    theme,
    defaultModel,
    workspaceLocation,
    responseStyle,
    autoStartOllama,
    keepOllamaRunning,
    onboardingComplete,
  };
}
