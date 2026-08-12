import { invoke, Channel } from '@tauri-apps/api/core';
import {
  OllamaModel,
  ChatMessage,
  ChatStreamChunk,
  PullProgressChunk,
  StartupResult,
} from './types';

const OLLAMA_BASE_URL = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? 'http://127.0.0.1:11434' : '';

function isTauriRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Initialize backend & Ollama service.
 * Automatic startup flow: Detect -> Start if needed -> Wait until ready -> Return status
 */
export async function initializeBackend(): Promise<StartupResult> {
  try {
    return await invoke<StartupResult>('initialize_backend');
  } catch (err) {
    return {
      installed: false,
      running: false,
      started_by_us: false,
      error: String(err),
    };
  }
}

export async function checkOllamaInstallation(): Promise<string> {
  return await invoke<string>('check_ollama_installation');
}

export async function checkOllamaRunning(): Promise<string> {
  return await invoke<string>('check_ollama_running');
}

export async function startOllamaServer(): Promise<void> {
  await invoke('start_ollama_server');
}

export async function listModels(): Promise<OllamaModel[]> {
  if (!isTauriRuntimeAvailable()) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.models ?? [];
    } catch (err) {
      console.warn('Browser preview could not reach Ollama:', err);
      return [];
    }
  }

  try {
    return await invoke<OllamaModel[]>('list_models');
  } catch (err) {
    console.error('Failed to list Ollama models:', err);
    return [];
  }
}

export async function streamChat(
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: ChatStreamChunk) => void
): Promise<void> {
  // Always use browser fetch first so requests are captured live in DevTools Network tab
  try {
    const baseUrl = OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (response.ok && response.body) {
      await readNdjsonStream(response.body, (chunk) => {
        onChunk(chunk as ChatStreamChunk);
      });
      return;
    }
  } catch (err) {
    console.warn('Fetch stream error, checking Tauri IPC fallback:', err);
  }

  if (isTauriRuntimeAvailable()) {
    const channel = new Channel<ChatStreamChunk>();
    channel.onmessage = (chunk) => {
      onChunk(chunk);
    };

    await invoke('chat_stream', {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      onChunk: channel,
    });
    return;
  }

  await streamChatViaHttp(model, messages, onChunk);
}

export async function generateChatTitle(
  model: string,
  prompt: string
): Promise<string> {
  if (!isTauriRuntimeAvailable()) {
    return prompt.trim().slice(0, 48) || 'New Chat';
  }

  try {
    return await invoke<string>('generate_chat_title', { model, prompt });
  } catch (err) {
    console.warn('Title generation error, falling back:', err);
    return 'New Chat';
  }
}

export async function pullModelStream(
  modelName: string,
  onProgress: (chunk: PullProgressChunk) => void
): Promise<void> {
  if (!isTauriRuntimeAvailable()) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Could not start model download from browser preview.');
    }

    await readNdjsonStream(response.body, (chunk) => {
      onProgress(chunk as PullProgressChunk);
    });
    return;
  }

  const channel = new Channel<PullProgressChunk>();
  channel.onmessage = (progress) => {
    onProgress(progress);
  };

  await invoke('pull_model_stream', {
    modelName,
    onProgress: channel,
  });
}

async function streamChatViaHttp(
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: ChatStreamChunk) => void
): Promise<void> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama returned HTTP ${response.status}`);
    }

    await readNdjsonStream(response.body, (chunk) => {
      onChunk(chunk as ChatStreamChunk);
    });
  } catch (err) {
    console.warn('Browser preview chat fallback:', err);
    const content = [
      'I am running in browser preview mode and cannot reach the local Ollama service at `127.0.0.1:11434`.',
      '',
      'To get real model responses here, start Ollama locally and make sure the selected model is downloaded. For the full desktop Runtime Manager, run the Tauri app instead of the browser preview.',
    ].join('\n');

    onChunk({
      done: true,
      message: {
        role: 'assistant',
        content,
      },
    });
  }
}

async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onJson: (chunk: unknown) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        onJson(JSON.parse(trimmed));
      }
    }
  }

  const remaining = buffer.trim();
  if (remaining) {
    onJson(JSON.parse(remaining));
  }
}
