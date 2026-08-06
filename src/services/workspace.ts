import { invoke } from '@tauri-apps/api/core';

export async function getDefaultWorkspacePath(): Promise<string> {
  try {
    return await invoke<string>('get_default_workspace_path');
  } catch (err) {
    console.warn('Failed to get default workspace path via Tauri:', err);
    return '~/nexus-agent-workspace';
  }
}

export async function initWorkspace(customPath?: string): Promise<string> {
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
  customWorkspace?: string
): Promise<string> {
  try {
    return await invoke<string>('save_workspace_file', {
      folder,
      filename,
      content,
      customWorkspace,
    });
  } catch (err) {
    console.warn('Fallback workspace file export:', err);
    // Browser fallback download trigger
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  }
}
