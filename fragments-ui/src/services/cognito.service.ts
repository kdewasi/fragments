// ────────────────────────────────────────────────────────────────────────────
// Cognito auth service — OIDC authorization-code flow via oidc-client-ts.
// The backend verifies Cognito *ID* tokens, so that is what we send as Bearer.
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
      // Tokens live in sessionStorage (per tab, cleared when the tab closes)
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      automaticSilentRenew: true,
      silent_redirect_uri: `${window.location.origin}/silent-callback.html`,
      post_logout_redirect_uri: window.location.origin,
    });
  }
  return userManager;
}

function formatCognitoUser(user: User): AuthUser {
  if (!user.id_token) throw new Error('Cognito did not return an ID token');
  const email = user.profile.email || '';
  return {
    username: user.profile.preferred_username || email || user.profile.sub || 'User',
    email,
    authorization: `Bearer ${user.id_token}`,
  };
}

/** The current signed-in Cognito user, or null */
export async function getCognitoUser(): Promise<AuthUser | null> {
  try {
    const user = await getUserManager().getUser();
    return user && !user.expired ? formatCognitoUser(user) : null;
  } catch {
    return null;
  }
}

/** Redirect to the Cognito Hosted UI */
export async function cognitoSignIn(): Promise<void> {
  await getUserManager().signinRedirect();
}

/** Complete the authorization-code flow after the redirect back */
export async function cognitoHandleCallback(): Promise<AuthUser> {
  const user = await getUserManager().signinRedirectCallback();
  return formatCognitoUser(user);
}

/** Sign out locally and at Cognito */
export async function cognitoSignOut(): Promise<void> {
  const mgr = getUserManager();
  await mgr.removeUser();
  await mgr.signoutRedirect();
}

/** Silent-renew callback (loaded in the hidden iframe) */
export async function cognitoHandleSilentCallback(): Promise<void> {
  await getUserManager().signinSilentCallback();
}
