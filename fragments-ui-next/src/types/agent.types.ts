// ────────────────────────────────────────────────────────────────────────────
// Agent system types — prepared for SSE/WebSocket streaming
// ────────────────────────────────────────────────────────────────────────────

/** Finite state machine for agent runner lifecycle */
export type AgentStatus = 'idle' | 'connecting' | 'thinking' | 'executing' | 'streaming' | 'completed' | 'failed';

/** A single streamed chunk from an agent response (SSE or WebSocket) */
export interface AgentChunk {
  /** Unique event ID for deduplication */
  id: string;
  /** The type of event (e.g., 'token', 'tool_call', 'status', 'error', 'done') */
  event: AgentEventType;
  /** The payload data */
  data: string;
  /** Server timestamp */
  timestamp: string;
}

/** Possible event types from the agent stream */
export type AgentEventType =
  | 'token'        // Partial text token (streaming LLM output)
  | 'tool_call'    // Agent is invoking a tool
  | 'tool_result'  // Tool returned a result
  | 'status'       // Agent state transition
  | 'error'        // Error occurred during agent execution
  | 'done';        // Stream completed

/** Full agent message (assembled from streamed chunks) */
export interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  status: AgentStatus;
  toolCalls?: AgentToolCall[];
  createdAt: string;
}

/** Record of a tool invocation during agent execution */
export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/** Configuration for connecting to an agent stream */
export interface AgentStreamConfig {
  /** Base URL for the agent API */
  baseUrl: string;
  /** Authentication token */
  token: string;
  /** Agent endpoint path */
  endpoint: string;
  /** Connection timeout in ms */
  timeout?: number;
  /** Auto-reconnect on disconnect */
  reconnect?: boolean;
  /** Max reconnection attempts */
  maxRetries?: number;
}
