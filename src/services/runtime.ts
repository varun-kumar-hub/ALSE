import { Channel, invoke } from '@tauri-apps/api/core';

export interface RuntimeProgress {
  step: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  progress: number;
  detail?: string;
}

export interface RuntimeResult {
  ready: boolean;
  workspace_path: string;
  models: string[];
  diagnostics: string[];
}

function isTauriRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function prepareRuntime(
  onProgress: (progress: RuntimeProgress) => void
): Promise<RuntimeResult> {
  if (!isTauriRuntimeAvailable()) {
    const previewSteps: RuntimeProgress[] = [
      {
        step: 'system',
        label: 'Browser Preview Mode',
        status: 'success',
        progress: 20,
        detail: 'Tauri desktop bindings are not available at this URL.',
      },
      {
        step: 'components',
        label: 'Using Web Fallbacks',
        status: 'warning',
        progress: 30,
        detail: 'Local chat data will use browser storage for this preview session.',
      },
      {
        step: 'runtime',
        label: 'Skipping Desktop Runtime',
        status: 'warning',
        progress: 42,
        detail: 'AI Runtime startup is only available inside the Tauri desktop app.',
      },
      {
        step: 'models',
        label: 'Skipping Model Check',
        status: 'warning',
        progress: 54,
        detail: 'Model discovery requires the desktop backend in this build.',
      },
      {
        step: 'workspace',
        label: 'Workspace Preview Ready',
        status: 'warning',
        progress: 66,
        detail: 'File exports will download through the browser instead of the desktop workspace.',
      },
      {
        step: 'database',
        label: 'Browser Storage Ready',
        status: 'success',
        progress: 78,
        detail: 'SQLite is unavailable in browser preview, so localStorage is active.',
      },
      {
        step: 'services',
        label: 'Preview Services Ready',
        status: 'success',
        progress: 90,
        detail: 'UI services are available with browser-safe fallbacks.',
      },
      {
        step: 'health',
        label: 'Preview Ready',
        status: 'success',
        progress: 100,
        detail: 'Run npm run dev for the full Tauri desktop Runtime Manager.',
      },
    ];

    for (const step of previewSteps) {
      onProgress(step);
    }

    return {
      ready: true,
      workspace_path: '~/nexus-agent-workspace',
      models: [],
      diagnostics: [
        'Running in browser preview mode.',
        'Tauri Runtime Manager commands are only available in the desktop app.',
      ],
    };
  }

  const channel = new Channel<RuntimeProgress>();
  channel.onmessage = onProgress;

  try {
    return await invoke<RuntimeResult>('prepare_runtime', { onProgress: channel });
  } catch (err) {
    return {
      ready: false,
      workspace_path: '',
      models: [],
      diagnostics: [
        'Runtime Manager is unavailable in browser preview mode.',
        String(err),
      ],
    };
  }
}
