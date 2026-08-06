import { invoke } from '@tauri-apps/api/core';
import { StartupCheckResult, SystemInfo } from './types';

export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    return await invoke<SystemInfo>('get_system_info');
  } catch (err) {
    return {
      os: 'windows',
      arch: 'x64',
      hostname: 'localhost',
    };
  }
}

export async function runSetupDiagnostics(): Promise<StartupCheckResult[]> {
  try {
    return await invoke<StartupCheckResult[]>('run_setup_diagnostics');
  } catch (err) {
    return [
      {
        step: 'browser_preview',
        status: 'warning',
        message: 'Running in Web Preview mode without Tauri backend bindings',
      },
    ];
  }
}
