// ────────────────────────────────────────────────────────────────────────────
// Authentication types
// ────────────────────────────────────────────────────────────────────────────

/** Authenticated user context */
export interface AuthUser {
  username: string;
  email: string;
  /** Full value of the Authorization header ("Basic ..." or "Bearer ...") */
  authorization: string;
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
