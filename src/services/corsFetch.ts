/**
 * Resilient Fetch wrapper supporting direct native fetch, Vite proxy routing, and CORS handling.
 * Enables OpenCode Zen, OpenAI, Claude, Gemini and custom APIs to function cleanly
 * in both Desktop app mode (Tauri) and Browser dev mode (http://localhost:1420) without CORS errors.
 */

export function getProxiedUrl(url: string): string {
  const isBrowserDev =
    typeof window !== 'undefined' &&
    !('__TAURI_INTERNALS__' in window) &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isBrowserDev) return url;

  if (url.startsWith('https://opencode.ai')) {
    return url.replace('https://opencode.ai', '/proxy/opencode');
  }
  if (url.startsWith('https://api.openai.com')) {
    return url.replace('https://api.openai.com', '/proxy/openai');
  }
  if (url.startsWith('https://api.anthropic.com')) {
    return url.replace('https://api.anthropic.com', '/proxy/anthropic');
  }
  if (url.startsWith('https://generativelanguage.googleapis.com')) {
    return url.replace('https://generativelanguage.googleapis.com', '/proxy/gemini');
  }

  return url;
}

export async function fetchWithCorsProxy(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const targetUrl = getProxiedUrl(url);
  return fetch(targetUrl, options);
}
