// ────────────────────────────────────────────────────────────────────────────
// Cognito Auth Service — OIDC flow using oidc-client-ts
// Handles Cognito Hosted UI redirect, token management, silent renewal
// ────────────────────────────────────────────────────────────────────────────

import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import type { AuthUser } from '../types';
import { config } from '../config';

let userManager: UserManager | null = null;

function getUserManager(): UserManager {
  if (!userManager) {
    userManager = new UserManager({
      authority: config.cognito.authority,
      client_id: config.cognito.clientId,
      redirect_uri: config.cognito.redirectUri,
      response_type: 'code',
      scope: config.cognito.scope,
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      automaticSilentRenew: true,
      silent_redirect_uri: `${window.location.origin}/silent-callback.html`,
      post_logout_redirect_uri: window.location.origin,
    });
  }
  return userManager;
}

function formatCognitoUser(user: User): AuthUser {
  return {
    username: user.profile.preferred_username || user.profile.email || user.profile.sub || 'User',
    email: user.profile.email || '',
    ownerId: user.profile.email || user.profile.sub || '',
    // For Cognito, token is the raw access_token (used as Bearer token)
    token: user.access_token,
  };
}

/** Get the current authenticated Cognito user, or null */
export async function getCognitoUser(): Promise<AuthUser | null> {
  try {
    const mgr = getUserManager();
    const user = await mgr.getUser();
    if (user && !user.expired) {
      return formatCognitoUser(user);
    }
    return null;
  } catch {
    return null;
  }
}

/** Redirect to Cognito Hosted UI for sign-in */
export async function cognitoSignIn(): Promise<void> {
  const mgr = getUserManager();
  await mgr.signinRedirect();
}

/** Handle the OAuth callback after redirect from Cognito */
export async function cognitoHandleCallback(): Promise<AuthUser> {
  const mgr = getUserManager();
  const user = await mgr.signinRedirectCallback();
  return formatCognitoUser(user);
}

/** Sign out via Cognito */
export async function cognitoSignOut(): Promise<void> {
  const mgr = getUserManager();
  await mgr.signoutRedirect();
}

/** Handle silent callback for token renewal (used in iframe) */
export async function cognitoHandleSilentCallback(): Promise<void> {
  const mgr = getUserManager();
  await mgr.signinSilentCallback();
}
