// ────────────────────────────────────────────────────────────────────────────
// Auth Service — handles Basic Auth for development + Cognito prep for production
// ────────────────────────────────────────────────────────────────────────────

import type { AuthUser, BasicAuthCredentials } from '../types';

/**
 * Encode Basic Auth credentials into a base64 token.
 */
export function encodeBasicAuth(credentials: BasicAuthCredentials): string {
  return btoa(`${credentials.username}:${credentials.password}`);
}

/**
 * Attempt Basic Auth sign-in by verifying credentials against the backend health check.
 * In production, this would be replaced with a Cognito token flow.
 */
export async function signInBasic(
  apiBaseUrl: string,
  credentials: BasicAuthCredentials
): Promise<AuthUser> {
  const token = encodeBasicAuth(credentials);

  // Verify credentials by making an authenticated API call
  const response = await fetch(`${apiBaseUrl}/v1/fragments`, {
    headers: { Authorization: `Basic ${token}` },
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  return {
    username: credentials.username,
    email: credentials.username,
    ownerId: credentials.username, // Backend hashes this
    token,
  };
}

/**
 * Sign out — clears local auth state.
 * For Cognito, this would also revoke the token.
 */
export function signOut(): void {
  // No-op for Basic Auth; in production, revoke Cognito session
}

/**
 * Check if stored credentials are still valid.
 * Returns the user if valid, null otherwise.
 */
export async function validateSession(
  apiBaseUrl: string,
  token: string | null
): Promise<AuthUser | null> {
  if (!token) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/v1/fragments`, {
      headers: { Authorization: `Basic ${token}` },
    });

    if (!response.ok) return null;

    // Decode the username from the token
    const decoded = atob(token);
    const username = decoded.split(':')[0];

    return {
      username,
      email: username,
      ownerId: username,
      token,
    };
  } catch {
    return null;
  }
}
