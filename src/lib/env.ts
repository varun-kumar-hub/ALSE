/**
 * Environment & Runtime Detection Utility
 */

export function isDevMode(): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return Boolean(import.meta.env.DEV || import.meta.env.MODE === 'development');
  }
  return false;
}

export function isTauriDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
