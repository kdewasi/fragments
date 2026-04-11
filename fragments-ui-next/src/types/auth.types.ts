// ────────────────────────────────────────────────────────────────────────────
// Authentication types
// ────────────────────────────────────────────────────────────────────────────

/** Authenticated user context */
export interface AuthUser {
  username: string;
  email: string;
  /** Hashed owner ID used by the backend */
  ownerId: string;
  /** Raw credentials or token for API calls */
  token: string;
}

/** Auth state for the application */
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/** Credentials for Basic Auth (development) */
export interface BasicAuthCredentials {
  username: string;
  password: string;
}
