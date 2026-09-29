// ────────────────────────────────────────────────────────────────────────────
// Basic Auth service (local development only — production uses Cognito)
// ────────────────────────────────────────────────────────────────────────────

import type { AuthUser, BasicAuthCredentials } from '../types';

const utf8ToBase64 = (value: string): string =>
  btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(''));

const base64ToUtf8 = (value: string): string =>
  new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));

/** Base64 "username:password" (UTF-8 safe) */
export function encodeBasicAuth(credentials: BasicAuthCredentials): string {
  return utf8ToBase64(`${credentials.username}:${credentials.password}`);
}

/** Full Authorization header value for the given credentials */
export function basicAuthorization(credentials: BasicAuthCredentials): string {
  return `Basic ${encodeBasicAuth(credentials)}`;
}

async function checkAuthorization(apiBaseUrl: string, authorization: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/v1/fragments`, {
    headers: { Authorization: authorization },
  });
  if (response.status === 401) throw new Error('Invalid credentials');
  if (!response.ok) throw new Error(`Sign-in failed (${response.status})`);
}

/** Verify credentials against the backend and return the user context. */
export async function signInBasic(
  apiBaseUrl: string,
  credentials: BasicAuthCredentials
): Promise<AuthUser> {
  const authorization = basicAuthorization(credentials);
  await checkAuthorization(apiBaseUrl, authorization);
  return { username: credentials.username, email: credentials.username, authorization };
}

/** Re-validate a stored Authorization value; null when it is missing or rejected. */
export async function validateSession(
  apiBaseUrl: string,
  authorization: string | null
): Promise<AuthUser | null> {
  if (!authorization || !authorization.startsWith('Basic ')) return null;
  try {
    await checkAuthorization(apiBaseUrl, authorization);
    const username = base64ToUtf8(authorization.slice('Basic '.length)).split(':')[0];
    return { username, email: username, authorization };
  } catch {
    return null;
  }
}
