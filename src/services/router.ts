/**
 * Application Router & Deep Linking State Synchronization Service
 * Ensures 100% resilient page retention on hard refresh (F5/Ctrl+R)
 * and deep linking across views, subjects/projects, and chats.
 */

export type WorkspaceView =
  | 'chat'
  | 'projects'
  | 'project_dashboard'
  | 'dashboard'
  | 'custom_assessment'
  | 'learn'
  | 'knowledge'
  | 'research'
  | 'story_challenge'
  | 'analytics'
  | 'evaluation_lab'
  | 'judge_control'
  | 'community'
  | 'welcome'
  | 'setup';

export interface RouteState {
  view: WorkspaceView;
  projectId: string | null;
  chatId: string | null;
}

const STORAGE_KEYS = {
  VIEW: 'ai_os_active_workspace_view',
  PROJECT: 'ai_os_active_project_id',
  CHAT: 'ai_os_active_chat_id',
};

const VALID_VIEWS: Set<WorkspaceView> = new Set([
  'chat',
  'projects',
  'project_dashboard',
  'dashboard',
  'custom_assessment',
  'learn',
  'knowledge',
  'research',
  'story_challenge',
  'analytics',
  'evaluation_lab',
  'judge_control',
  'community',
  'welcome',
  'setup',
]);

/**
 * Parses the current URL hash or query params, with fallback to localStorage.
 * Guarantees hard refresh remains on the exact same view, subject, and chat.
 */
export function parseCurrentRoute(): RouteState {
  if (typeof window === 'undefined') {
    return { view: 'chat', projectId: null, chatId: null };
  }

  // 1. Inspect URL hash (e.g. "#/story_challenge?project=comm-dl-backprop" or "#/projects")
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
  let viewFromUrl: string | null = null;
  let resolvedProject: string | null = null;
  let resolvedChat: string | null = null;

  if (rawHash) {
    const [pathPart, queryPart] = rawHash.split('?');
    const pathSegments = pathPart.split('/').filter(Boolean);

    if (pathSegments.length > 0) {
      const firstSeg = pathSegments[0] as WorkspaceView;
      if (VALID_VIEWS.has(firstSeg)) {
        viewFromUrl = firstSeg;
        if (pathSegments.length > 1) {
          resolvedProject = pathSegments[1];
        }
      }
    }

    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      resolvedProject = searchParams.get('project') || searchParams.get('projectId') || resolvedProject;
      resolvedChat = searchParams.get('chat') || searchParams.get('chatId') || searchParams.get('id') || resolvedChat;
    }
  }

  // 2. Also inspect window.location.search if not in hash
  if (!resolvedProject || !resolvedChat) {
    const searchParams = new URLSearchParams(window.location.search);
    resolvedProject = resolvedProject || searchParams.get('project') || searchParams.get('projectId');
    resolvedChat = resolvedChat || searchParams.get('chat') || searchParams.get('chatId') || searchParams.get('id');
  }

  // 3. Fallback to LocalStorage
  const storedView = localStorage.getItem(STORAGE_KEYS.VIEW) as WorkspaceView | null;
  const storedProject = localStorage.getItem(STORAGE_KEYS.PROJECT);
  const storedChat = localStorage.getItem(STORAGE_KEYS.CHAT);

  const finalView: WorkspaceView =
    viewFromUrl && VALID_VIEWS.has(viewFromUrl as WorkspaceView)
      ? (viewFromUrl as WorkspaceView)
      : storedView && VALID_VIEWS.has(storedView)
      ? storedView
      : 'chat';

  const finalProject =
    resolvedProject && resolvedProject !== 'null' && resolvedProject !== 'general'
      ? resolvedProject
      : storedProject && storedProject !== 'null' && storedProject !== 'general'
      ? storedProject
      : null;

  const finalChat =
    resolvedChat && resolvedChat !== 'null'
      ? resolvedChat
      : storedChat && storedChat !== 'null'
      ? storedChat
      : null;

  return {
    view: finalView,
    projectId: finalProject,
    chatId: finalChat,
  };
}

/**
 * Synchronizes route changes to both URL Hash and LocalStorage without full page reload.
 */
export function navigateToRoute(
  view: WorkspaceView,
  projectId?: string | null,
  chatId?: string | null,
  replace = false
): void {
  if (typeof window === 'undefined') return;

  const validView: WorkspaceView = VALID_VIEWS.has(view) ? view : 'chat';
  const cleanProject = projectId && projectId !== 'null' && projectId !== 'general' ? projectId : null;
  const cleanChat = chatId && chatId !== 'null' ? chatId : null;

  // 1. Save to LocalStorage for persistent recovery
  localStorage.setItem(STORAGE_KEYS.VIEW, validView);

  if (cleanProject) {
    localStorage.setItem(STORAGE_KEYS.PROJECT, cleanProject);
  } else if (projectId === null) {
    localStorage.removeItem(STORAGE_KEYS.PROJECT);
  }

  if (cleanChat) {
    localStorage.setItem(STORAGE_KEYS.CHAT, cleanChat);
  } else if (chatId === null) {
    localStorage.removeItem(STORAGE_KEYS.CHAT);
  }

  // 2. Build URL Hash
  const params = new URLSearchParams();
  if (cleanProject) params.set('project', cleanProject);
  if (cleanChat) params.set('chat', cleanChat);

  const paramStr = params.toString() ? `?${params.toString()}` : '';
  const newHash = `#/${validView}${paramStr}`;

  // 3. Update Browser URL cleanly
  if (window.location.hash !== newHash) {
    if (replace) {
      window.history.replaceState(null, '', newHash);
    } else {
      window.history.pushState(null, '', newHash);
    }
  }
}
