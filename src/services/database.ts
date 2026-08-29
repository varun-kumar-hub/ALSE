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
  await addColumnIfMissing(db, 'messages', 'model_id', 'TEXT');
  await addColumnIfMissing(db, 'messages', 'model_name', 'TEXT');
  await addColumnIfMissing(db, 'messages', 'provider', 'TEXT');
  await addColumnIfMissing(db, 'messages', 'mode', 'TEXT');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_model_config (
      chat_id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

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
    `SELECT id, title, created_at, updated_at, pinned = 1 as pinned, model, project_id, context_summary FROM chats ORDER BY pinned DESC, updated_at DESC`
  );
  return rows;
}

export async function getGlobalChats(): Promise<Chat[]> {
  const all = await getChats();
  return all.filter((c) => !c.project_id);
}

export async function getProjectChats(projectId: string): Promise<Chat[]> {
  const all = await getChats();
  return all.filter((c) => c.project_id === projectId);
}

export async function createChat(title = 'New Chat', model?: string, projectId?: string): Promise<Chat> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newChat: Chat = {
    id,
    title,
    created_at: now,
    updated_at: now,
    pinned: false,
    model,
    project_id: projectId,
  };

  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats();
    chats.unshift(newChat);
    localStorageFallback.saveChats(chats);
    return newChat;
  }

  await db.execute(
    `INSERT INTO chats (id, title, created_at, updated_at, pinned, model, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, title, now, now, 0, model ?? null, projectId ?? null]
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

export async function toggleChatReadStatus(id: string, isRead: boolean): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats();
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.is_read = isRead;
      localStorageFallback.saveChats(chats);
    }
    return;
  }

  await db.execute(`UPDATE chats SET is_read = $1 WHERE id = $2`, [isRead ? 1 : 0, id]);
}

export async function moveChatToProject(id: string, projectId: string | null): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats();
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.project_id = projectId || undefined;
      localStorageFallback.saveChats(chats);
    }
    return;
  }

  await db.execute(`UPDATE chats SET project_id = $1 WHERE id = $2`, [projectId ?? null, id]);
}

export async function moveChatToGroup(id: string, groupName: string | null): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const chats = localStorageFallback.getChats();
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.group_name = groupName || undefined;
      localStorageFallback.saveChats(chats);
    }
    return;
  }

  await db.execute(`UPDATE chats SET group_name = $1 WHERE id = $2`, [groupName ?? null, id]);
}

export async function toggleProjectPinned(id: string, isPinned: boolean): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const projects = await getProjects();
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      proj.is_pinned = isPinned;
      localStorage.setItem('ai_os_projects', JSON.stringify(projects));
    }
    return;
  }

  await db.execute(`UPDATE workspace_projects SET is_pinned = $1 WHERE id = $2`, [isPinned ? 1 : 0, id]);
}

export async function renameProject(id: string, newName: string): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const projects = await getProjects();
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      proj.name = newName;
      localStorage.setItem('ai_os_projects', JSON.stringify(projects));
    }
    return;
  }

  await db.execute(`UPDATE workspace_projects SET name = $1 WHERE id = $2`, [newName, id]);
}

export async function moveProjectToGroup(id: string, groupName: string | null): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const projects = await getProjects();
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      proj.group_name = groupName || undefined;
      localStorage.setItem('ai_os_projects', JSON.stringify(projects));
    }
    return;
  }

  await db.execute(`UPDATE workspace_projects SET group_name = $1 WHERE id = $2`, [groupName ?? null, id]);
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
    `SELECT id, chat_id, role, content, intent, model_id, model_name, provider as provider_used, mode as mode_used, created_at, tokens_used, generation_time_ms FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
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
  intent?: ChatMessage['intent'],
  modelMeta?: { model_id?: string; model_name?: string; provider?: string; mode?: 'cloud' | 'local' }
): Promise<ChatMessage> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const msg: ChatMessage = {
    id,
    chat_id: chatId,
    role,
    content,
    intent,
    model_id: modelMeta?.model_id,
    model_name: modelMeta?.model_name,
    provider_used: modelMeta?.provider,
    mode_used: modelMeta?.mode,
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
    `INSERT INTO messages (id, chat_id, role, content, intent, model_id, model_name, provider, mode, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      chatId,
      role,
      content,
      intent ?? null,
      modelMeta?.model_id ?? null,
      modelMeta?.model_name ?? null,
      modelMeta?.provider ?? null,
      modelMeta?.mode ?? null,
      now,
    ]
  );

  await db.execute(`UPDATE chats SET updated_at = $1 WHERE id = $2`, [now, chatId]);

  return msg;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    // Check all chat message stores in localStorageFallback
    const chats = localStorageFallback.getChats();
    for (const chat of chats) {
      const msgs = localStorageFallback.getMessages(chat.id);
      const filtered = msgs.filter((m) => m.id !== messageId);
      if (filtered.length !== msgs.length) {
        localStorageFallback.saveMessages(chat.id, filtered);
        break;
      }
    }
    return;
  }

  await db.execute(`DELETE FROM messages WHERE id = $1`, [messageId]);
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
  topic?: string;
  goal?: string;
  description?: string;
  learning_budget?: number;
  icon?: string;
  color?: string;
  instructions?: string;
  is_pinned?: boolean;
  group_name?: string;
  created_at: string;
  updated_at?: string;
  is_archived?: boolean;
  is_public?: boolean;
  author?: string;
  likes_count?: number;
  clones_count?: number;
  tags?: string[];
}

export interface NoteItem {
  id: string;
  title: string;
  category: 'code' | 'research' | 'snippet' | 'general';
  content: string;
  updatedAt: string;
}

const DEFAULT_COMMUNITY_PROJECTS: ProjectItem[] = [
  {
    id: 'comm-dl-backprop',
    name: 'Deep Learning & Backpropagation',
    topic: 'Neural Networks & Optimization',
    goal: 'Master chain rule derivations, matrix gradients, and optimizer algorithms',
    description: 'Complete mathematical foundations of backpropagation, tensor jacobians, loss landscapes, and Adam/SGD optimizers.',
    learning_budget: 45,
    icon: '🧠',
    is_public: true,
    author: 'LearnForge Science Lab',
    likes_count: 142,
    clones_count: 89,
    tags: ['Machine Learning', 'Mathematics', 'Neural Networks'],
    created_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'comm-os-concurrency',
    name: 'Operating Systems & Concurrency',
    topic: 'Systems Architecture',
    goal: 'Master kernel scheduling, virtual memory paging, and deadlock synchronization',
    description: 'Comprehensive study of POSIX threads, race condition prevention, semaphores, memory management units, and scheduling.',
    learning_budget: 35,
    icon: '⚡',
    is_public: true,
    author: 'Systems Engineering Collective',
    likes_count: 118,
    clones_count: 74,
    tags: ['Operating Systems', 'Concurrency', 'Linux Kernel'],
    created_at: '2026-08-05T00:00:00.000Z',
  },
  {
    id: 'comm-system-design-raft',
    name: 'Distributed Systems & Raft Consensus',
    topic: 'Distributed Architecture',
    goal: 'Understand leader election, log replication, safety guarantees, and split-brain recovery',
    description: 'In-depth coverage of fault-tolerant distributed state machines, RPC protocols, quorum intersection, and vector clocks.',
    learning_budget: 40,
    icon: '🌐',
    is_public: true,
    author: 'Distributed Systems Group',
    likes_count: 96,
    clones_count: 61,
    tags: ['System Design', 'Distributed Systems', 'Raft'],
    created_at: '2026-08-10T00:00:00.000Z',
  },
  {
    id: 'comm-quantum-mechanics',
    name: 'Quantum Computing Fundamentals',
    topic: 'Quantum Information',
    goal: 'Master qubits, superposition, entanglement, Bloch sphere rotations, and quantum gates',
    description: 'Linear algebra basis vectors, unitary transformations, Hadamard gates, Bell states, and quantum teleportation.',
    learning_budget: 50,
    icon: '⚛️',
    is_public: true,
    author: 'Quantum Physics Initiative',
    likes_count: 85,
    clones_count: 48,
    tags: ['Quantum Computing', 'Physics', 'Linear Algebra'],
    created_at: '2026-08-15T00:00:00.000Z',
  },
];

const DEFAULT_PROJECTS: ProjectItem[] = [];

export async function getProjects(): Promise<ProjectItem[]> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const raw = localStorage.getItem('ai_os_projects');
    if (!raw) {
      localStorage.setItem('ai_os_projects', JSON.stringify(DEFAULT_PROJECTS));
      return DEFAULT_PROJECTS;
    }
    const parsed: ProjectItem[] = JSON.parse(raw);
    const cleaned = parsed.filter((p) => !['data-structures', 'agririsk', 'adaptive-learning'].includes(p.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem('ai_os_projects', JSON.stringify(cleaned));
    }
    return cleaned;
  }
  const rows = await db.select<ProjectItem[]>(`SELECT id, name, description, created_at FROM workspace_projects ORDER BY created_at DESC`);
  if (rows.length === 0) {
    for (const p of DEFAULT_PROJECTS) {
      await db.execute(
        `INSERT INTO workspace_projects (id, name, description, created_at) VALUES ($1, $2, $3, $4)`,
        [p.id, p.name, p.description || '', p.created_at]
      );
    }
    return DEFAULT_PROJECTS;
  }
  return rows;
}

export async function getCommunityProjects(): Promise<ProjectItem[]> {
  const userProjects = await getProjects();
  const publicUserProjects = userProjects.filter((p) => p.is_public);
  const rawCommunity = localStorage.getItem('learnforge_community_projects');
  let customCommunity: ProjectItem[] = [];
  if (rawCommunity) {
    try {
      customCommunity = JSON.parse(rawCommunity);
    } catch {
      customCommunity = [];
    }
  }

  // Combine default community projects + any published user projects
  const map = new Map<string, ProjectItem>();
  DEFAULT_COMMUNITY_PROJECTS.forEach((p) => map.set(p.id, p));
  customCommunity.forEach((p) => map.set(p.id, p));
  publicUserProjects.forEach((p) => map.set(p.id, p));

  return Array.from(map.values());
}

export async function toggleProjectPublicStatus(projectId: string, isPublic: boolean): Promise<void> {
  const existing = await getProjects();
  const target = existing.find((p) => p.id === projectId);
  if (!target) return;

  const updatedTarget = {
    ...target,
    is_public: isPublic,
    author: target.author || 'LearnForge Learner',
    updated_at: new Date().toISOString(),
  };

  await updateProject(projectId, { is_public: isPublic });

  // Update in community storage
  const rawCommunity = localStorage.getItem('learnforge_community_projects');
  let customCommunity: ProjectItem[] = rawCommunity ? JSON.parse(rawCommunity) : [];
  if (isPublic) {
    customCommunity = [updatedTarget, ...customCommunity.filter((p) => p.id !== projectId)];
  } else {
    customCommunity = customCommunity.filter((p) => p.id !== projectId);
  }
  localStorage.setItem('learnforge_community_projects', JSON.stringify(customCommunity));
}

export async function cloneCommunityProject(communityProj: ProjectItem): Promise<ProjectItem> {
  const newId = String(Date.now());
  const cloned: ProjectItem = {
    ...communityProj,
    id: newId,
    name: `${communityProj.name} (Copy)`,
    is_public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const existing = await getProjects();
  localStorage.setItem('ai_os_projects', JSON.stringify([cloned, ...existing]));
  return cloned;
}

export async function createProject(
  name: string,
  topic?: string,
  goal?: string,
  description?: string,
  learningBudget = 30,
  instructions?: string
): Promise<ProjectItem> {
  const id = String(Date.now());
  const created_at = new Date().toISOString();
  const project: ProjectItem = {
    id,
    name,
    topic: topic || name,
    goal: goal || 'Master core domain concepts',
    description,
    learning_budget: learningBudget,
    instructions,
    created_at,
  };
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    const existing = await getProjects();
    localStorage.setItem('ai_os_projects', JSON.stringify([project, ...existing]));
    return project;
  }
  await db.execute(`INSERT INTO workspace_projects (id, name, description, created_at) VALUES ($1, $2, $3, $4)`, [id, name, description || '', created_at]);
  return project;
}

export const addProject = createProject;

export async function updateProject(id: string, updates: Partial<ProjectItem>): Promise<void> {
  const existing = await getProjects();
  const updated = existing.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
  localStorage.setItem('ai_os_projects', JSON.stringify(updated));
}

export async function deleteProject(id: string): Promise<void> {
  const existing = await getProjects();
  const filtered = existing.filter((p) => p.id !== id);
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    localStorage.setItem('ai_os_projects', JSON.stringify(filtered));
    const chats = localStorageFallback.getChats();
    const updatedChats = chats.map((c) => (c.project_id === id ? { ...c, project_id: undefined } : c));
    localStorageFallback.saveChats(updatedChats);
    return;
  }
  await db.execute(`DELETE FROM workspace_projects WHERE id = $1`, [id]);
  await db.execute(`UPDATE chats SET project_id = NULL WHERE project_id = $1`, [id]);
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

export async function clearAllChatsAndMessages(): Promise<void> {
  const db = await initDatabase();
  if (isFallbackMode || !db) {
    localStorage.removeItem('ai_os_chats');
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('ai_os_msg_')) localStorage.removeItem(k);
    });
    return;
  }
  await db.execute(`DELETE FROM messages`);
  await db.execute(`DELETE FROM chats`);
}
