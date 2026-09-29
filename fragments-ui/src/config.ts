// ────────────────────────────────────────────────────────────────────────────
// Environment configuration — single source of truth.
// Every value comes from a VITE_* variable (see .env.example); nothing
// deployment-specific is hard-coded here.
// ────────────────────────────────────────────────────────────────────────────

export type AuthMode = 'cognito' | 'basic';

const env = import.meta.env;

function readAuthMode(): AuthMode {
  const mode = env.VITE_AUTH_MODE || 'basic';
  if (mode !== 'basic' && mode !== 'cognito') {
    throw new Error(`Unsupported VITE_AUTH_MODE "${mode}" (expected "basic" or "cognito")`);
  }
  return mode;
}

const authMode = readAuthMode();

const cognito = {
  authority: env.VITE_COGNITO_AUTHORITY ?? '',
  clientId: env.VITE_COGNITO_CLIENT_ID ?? '',
  redirectUri: env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/callback`,
  scope: 'openid email profile',
};

if (authMode === 'cognito' && !(cognito.authority && cognito.clientId)) {
  throw new Error('VITE_AUTH_MODE=cognito requires VITE_COGNITO_AUTHORITY and VITE_COGNITO_CLIENT_ID');
}

export const config = {
  /** Fragments backend API URL (no trailing slash) */
  apiBaseUrl: (env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, ''),
  appName: 'Fragments',
  version: env.VITE_APP_VERSION || '1.0.0',
  /** 'basic' for local development, 'cognito' for production */
  authMode,
  cognito,
} as const;
