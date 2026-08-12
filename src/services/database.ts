import Database from '@tauri-apps/plugin-sql';
import { Chat, ChatMessage, AppSettings } from './types';
import { DEFAULT_PROVIDER_CONFIGS, mergeProviderConfigs } from './providers';

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

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Initialize SQLite database connection and run schema migrations.
 */
export async function initDatabase(): Promise<Database | null> {
  if (dbInstance) return dbInstance;
  if (isFallbackMode) return null;
  if (!isTauri()) {
    isFallbackMode = true;
    return null;
  }

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspace_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notebook_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

export async function getSanitizedMessagesForMode(
  chatId: string,
  targetMode: 'local' | 'cloud' | 'hybrid'
): Promise<ChatMessage[]> {
  const messages = await getMessages(chatId);
  if (targetMode !== 'cloud') return messages;

  // Filter out unformatted reasoning tags (<think>...</think>) produced by local models
  return messages.map((m) => {
    if (m.role === 'assistant') {
      const sanitizedContent = m.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      return { ...m, content: sanitizedContent || m.content };
    }
    return m;
  });
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
  let assistantName = await getSetting('assistantName', 'Nexus Agent');
  if (assistantName === 'AI OS' || assistantName === 'AI Operating System') {
    assistantName = 'Nexus Agent';
    await setSetting('assistantName', assistantName);
  }

  const theme = (await getSetting('theme', 'dark')) as AppSettings['theme'];
  const defaultModel = await getSetting('defaultModel', 'llama3.2:latest');
  const aiMode = (await getSetting('aiMode', 'hybrid')) as AppSettings['aiMode'];
  const defaultProvider = await getSetting('defaultProvider', 'ollama');
  const rawProviderConfigs = await getSetting('providerConfigs', JSON.stringify(DEFAULT_PROVIDER_CONFIGS));
  let providerConfigs = DEFAULT_PROVIDER_CONFIGS;
  try {
    providerConfigs = mergeProviderConfigs(JSON.parse(rawProviderConfigs));
  } catch (err) {
    console.warn('Invalid provider configuration; restoring defaults:', err);
    providerConfigs = DEFAULT_PROVIDER_CONFIGS;
  }
  const workspaceLocation = await getSetting('workspaceLocation', '');
  const responseStyle = (await getSetting('responseStyle', 'adaptive')) as AppSettings['responseStyle'];
  const autoStartOllama = (await getSetting('autoStartOllama', 'true')) === 'true';
  const keepOllamaRunning = (await getSetting('keepOllamaRunning', 'true')) === 'true';
  const onboardingComplete = (await getSetting('onboardingComplete', 'false')) === 'true';
  const skipLauncherInDev = (await getSetting('skipLauncherInDev', 'true')) === 'true';

  return {
    assistantName,
    theme,
    defaultModel,
    aiMode,
    defaultProvider,
    providerConfigs,
    workspaceLocation,
    responseStyle,
    autoStartOllama,
    keepOllamaRunning,
    onboardingComplete,
    skipLauncherInDev,
  };
}

/* ================= Projects & Notes CRUD ================= */

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface NoteItem {
  id: string;
  title: string;
  category: 'code' | 'research' | 'snippet' | 'general';
  content: string;
  updatedAt: string;
}

export async function getProjects(): Promise<ProjectItem[]> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const raw = localStorage.getItem('ai_os_projects');
    return raw ? JSON.parse(raw) : [];
  }
  return db.select<ProjectItem[]>(`SELECT id, name, description, created_at FROM workspace_projects ORDER BY created_at DESC`);
}

export async function createProject(name: string, description?: string): Promise<ProjectItem> {
  const id = String(Date.now());
  const created_at = new Date().toISOString();
  const project: ProjectItem = { id, name, description, created_at };
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const existing = await getProjects();
    localStorage.setItem('ai_os_projects', JSON.stringify([project, ...existing]));
    return project;
  }
  await db.execute(`INSERT INTO workspace_projects (id, name, description, created_at) VALUES ($1, $2, $3, $4)`, [id, name, description || '', created_at]);
  return project;
}

export async function getNotebookNotes(): Promise<NoteItem[]> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const raw = localStorage.getItem('ai_os_notes');
    return raw ? JSON.parse(raw) : [];
  }
  const rows = await db.select<{ id: string; title: string; category: string; content: string; updated_at: string }[]>(
    `SELECT id, title, category, content, updated_at FROM notebook_notes ORDER BY updated_at DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category as NoteItem['category'],
    content: r.content,
    updatedAt: r.updated_at,
  }));
}

export async function saveNotebookNote(note: NoteItem): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const existing = await getNotebookNotes();
    const filtered = existing.filter((n) => n.id !== note.id);
    localStorage.setItem('ai_os_notes', JSON.stringify([note, ...filtered]));
    return;
  }
  await db.execute(
    `INSERT INTO notebook_notes (id, title, category, content, updated_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, category = excluded.category, content = excluded.content, updated_at = excluded.updated_at`,
    [note.id, note.title, note.category, note.content, note.updatedAt]
  );
}

export async function deleteNotebookNote(id: string): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const existing = await getNotebookNotes();
    localStorage.setItem('ai_os_notes', JSON.stringify(existing.filter((n) => n.id !== id)));
    return;
  }
  await db.execute(`DELETE FROM notebook_notes WHERE id = $1`, [id]);
}
