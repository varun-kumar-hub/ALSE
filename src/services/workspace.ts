import { invoke } from '@tauri-apps/api/core';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getDefaultWorkspacePath(): Promise<string> {
  if (!isTauri()) return '~/nexus-agent-workspace';
  try {
    return await invoke<string>('get_default_workspace_path');
  } catch (err) {
    console.warn('Failed to get default workspace path via Tauri:', err);
    return '~/nexus-agent-workspace';
  }
}

export async function initWorkspace(customPath?: string): Promise<string> {
  if (!isTauri()) return customPath || '~/nexus-agent-workspace';
  try {
    return await invoke<string>('init_workspace', { customPath });
  } catch (err) {
    console.warn('Failed to initialize workspace via Tauri:', err);
    return customPath || '~/nexus-agent-workspace';
  }
}

export async function saveWorkspaceFile(
  folder: string,
  filename: string,
  content: string,
  customWorkspace?: string,
  triggerBrowserDownload = false
): Promise<string> {
  if (!isTauri()) {
    try {
      localStorage.setItem(`nexus_workspace_${folder}_${filename}`, content);
    } catch {
      // storage quota or private browsing
    }

    if (triggerBrowserDownload) {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    return filename;
  }

  try {
    return await invoke<string>('save_workspace_file', {
      folder,
      filename,
      content,
      customWorkspace,
    });
  } catch (err) {
    console.warn('Workspace file save error:', err);
    return filename;
  }
}

