/**
 * Nexus-Agent WebSocket Client Bridge (Tauri <-> Python Sidecar)
 * Handles real-time WebSocket token streaming, <think> reasoning events, and tool execution events.
 */

export interface WsGenerationRequest {
  session_id: string;
  prompt: string;
  model: string;
  provider: string;
  enable_tools?: boolean;
  enable_memory?: boolean;
}

export type WsEvent =
  | { type: 'think_token'; content: string }
  | { type: 'text_token'; content: string }
  | { type: 'tool_call_start'; tool: string; args: Record<string, any> }
  | { type: 'tool_call_complete'; tool: string; status: 'success' | 'error'; result: any }
  | { type: 'generation_complete'; total_tokens: number };

export class SidecarWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url = 'ws://127.0.0.1:8000/ws/generate') {
    this.url = url;
  }

  /**
   * Connects to the Python sidecar WebSocket endpoint and streams generation events.
   */
  public connectAndStream(
    request: WsGenerationRequest,
    onEvent: (event: WsEvent) => void,
    onError?: (err: Event | Error) => void
  ): () => void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify(request));
      };

      this.ws.onmessage = (event) => {
        try {
          const parsedEvent: WsEvent = JSON.parse(event.data);
          onEvent(parsedEvent);
        } catch {
          // If message is raw text token fallback
          onEvent({ type: 'text_token', content: event.data });
        }
      };

      this.ws.onerror = (err) => {
        if (onError) onError(err);
      };

      this.ws.onclose = () => {
        onEvent({ type: 'generation_complete', total_tokens: 0 });
      };
    } catch (err) {
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    }

    // Return cleanup / abort handle
    return () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    };
  }
}

export const sidecarWsClient = new SidecarWebSocketClient();
