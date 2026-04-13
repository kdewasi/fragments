// ────────────────────────────────────────────────────────────────────────────
// Environment configuration — single source of truth
// ────────────────────────────────────────────────────────────────────────────

/**
 * Auth mode:
 * - 'cognito': Use AWS Cognito Hosted UI (production)
 * - 'basic':   Use HTTP Basic Auth (local development)
 *
 * Set via VITE_AUTH_MODE env var. Defaults to 'basic' for local dev.
 */
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

  /** Auth mode: 'cognito' or 'basic' */
  authMode: (import.meta.env.VITE_AUTH_MODE || 'basic') as 'cognito' | 'basic',

  /** Cognito configuration (only used when authMode === 'cognito') */
  cognito: {
    authority: import.meta.env.VITE_COGNITO_AUTHORITY || 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_2zaNaWSL5',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '47v2i0gp7gbjojks3dtcb6cdmm',
    redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/callback`,
    scope: 'openid email profile',
  },
} as const;
