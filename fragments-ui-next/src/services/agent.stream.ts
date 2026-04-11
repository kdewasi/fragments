// ────────────────────────────────────────────────────────────────────────────
// Agent Stream Service — SSE/WebSocket client for real-time agent interactions
// This service is agent-ready: designed to handle streamed LLM responses,
// tool invocations, and status transitions.
// ────────────────────────────────────────────────────────────────────────────

import type { AgentChunk, AgentEventType, AgentStreamConfig, AgentStatus } from '../types';

/** Callbacks for stream lifecycle events */
export interface AgentStreamCallbacks {
  onChunk: (chunk: AgentChunk) => void;
  onStatusChange: (status: AgentStatus) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

/**
 * Create an SSE-based agent stream connection.
 * Returns a controller object to manage the connection lifecycle.
 *
 * Usage:
 * ```ts
 * const stream = createAgentStream(config, {
 *   onChunk: (chunk) => appendToMessage(chunk.data),
 *   onStatusChange: (status) => setAgentStatus(status),
 *   onError: (err) => showError(err),
 *   onComplete: () => finalize(),
 * });
 *
 * stream.connect({ prompt: 'Hello, agent!' });
 * // later...
 * stream.disconnect();
 * ```
 */
export function createAgentStream(config: AgentStreamConfig, callbacks: AgentStreamCallbacks) {
  let eventSource: EventSource | null = null;
  let retryCount = 0;
  const maxRetries = config.maxRetries ?? 3;
  const reconnect = config.reconnect ?? true;

  function parseChunk(event: MessageEvent): AgentChunk {
    try {
      return JSON.parse(event.data) as AgentChunk;
    } catch {
      return {
        id: crypto.randomUUID(),
        event: 'token' as AgentEventType,
        data: event.data,
        timestamp: new Date().toISOString(),
      };
    }
  }

  function connect(payload: Record<string, unknown>): void {
    // Close any existing connection
    disconnect();

    callbacks.onStatusChange('connecting');

    const url = new URL(config.endpoint, config.baseUrl);
    // Encode payload as query params for SSE GET request
    url.searchParams.set('payload', JSON.stringify(payload));
    url.searchParams.set('token', config.token);

    eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      retryCount = 0;
      callbacks.onStatusChange('thinking');
    };

    // Listen for typed events
    const eventTypes: AgentEventType[] = ['token', 'tool_call', 'tool_result', 'status', 'error', 'done'];

    for (const eventType of eventTypes) {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        const chunk = parseChunk(event);
        chunk.event = eventType;

        if (eventType === 'status') {
          callbacks.onStatusChange(chunk.data as AgentStatus);
        } else if (eventType === 'error') {
          callbacks.onError(new Error(chunk.data));
          callbacks.onStatusChange('failed');
        } else if (eventType === 'done') {
          callbacks.onStatusChange('completed');
          callbacks.onComplete();
          disconnect();
        } else {
          callbacks.onChunk(chunk);
        }
      });
    }

    // Fallback for untyped messages
    eventSource.onmessage = (event: MessageEvent) => {
      const chunk = parseChunk(event);
      callbacks.onChunk(chunk);
    };

    eventSource.onerror = () => {
      if (reconnect && retryCount < maxRetries) {
        retryCount++;
        callbacks.onStatusChange('connecting');
        // EventSource auto-reconnects; we just track retries
      } else {
        callbacks.onError(new Error('Agent stream connection failed after max retries'));
        callbacks.onStatusChange('failed');
        disconnect();
      }
    };
  }

  function disconnect(): void {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  function isConnected(): boolean {
    return eventSource !== null && eventSource.readyState !== EventSource.CLOSED;
  }

  return {
    connect,
    disconnect,
    isConnected,
  };
}

/** Type for the stream controller */
export type AgentStreamController = ReturnType<typeof createAgentStream>;
