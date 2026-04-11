// ────────────────────────────────────────────────────────────────────────────
// Environment configuration — single source of truth
// ────────────────────────────────────────────────────────────────────────────

export const config = {
  /** Fragments backend API URL */
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  /** Agent stream endpoint (future) */
  agentBaseUrl: import.meta.env.VITE_AGENT_URL || 'http://localhost:8081',
  /** Agent stream path */
  agentEndpoint: import.meta.env.VITE_AGENT_ENDPOINT || '/v1/agent/stream',
  /** App name */
  appName: 'Fragments',
  /** Version */
  version: import.meta.env.VITE_APP_VERSION || '2.0.0',
} as const;
