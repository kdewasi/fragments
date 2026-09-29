// ────────────────────────────────────────────────────────────────────────────
// useAuth — authentication state. Basic Auth (development) or Cognito (production).
// ────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import type { AuthState, BasicAuthCredentials } from '../types';
import {
  signInBasic,
  validateSession,
  getCognitoUser,
  cognitoSignIn,
  cognitoSignOut,
  cognitoHandleCallback,
  clearOfflineData,
} from '../services';
import { config } from '../config';

// Basic Auth credentials are kept per tab only (sessionStorage), never in localStorage
const AUTH_STORAGE_KEY = 'fragments.authorization';

const signedOut: AuthState = { user: null, isAuthenticated: false, isLoading: false, error: null };

interface UseAuthReturn extends AuthState {
  /** Basic: sign in with credentials. Cognito: redirect to the Hosted UI. */
  signIn: (credentials?: BasicAuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  isCognito: boolean;
}

export function useAuth(apiBaseUrl: string): UseAuthReturn {
  const isCognito = config.authMode === 'cognito';

  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // ── Cognito: complete the redirect callback or restore an existing session ──
  useEffect(() => {
    if (!isCognito) return;

    const restore = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('code')) {
        try {
          const user = await cognitoHandleCallback();
          setState({ user, isAuthenticated: true, isLoading: false, error: null });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Cognito sign-in failed';
          setState({ ...signedOut, error: message });
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }

      const user = await getCognitoUser();
      setState(user ? { user, isAuthenticated: true, isLoading: false, error: null } : signedOut);
    };

    void restore();
  }, [isCognito]);

  // ── Basic Auth: re-validate the stored Authorization value ──────────────────
  useEffect(() => {
    if (isCognito) return;

    const restore = async () => {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      const user = stored ? await validateSession(apiBaseUrl, stored) : null;
      if (!user) sessionStorage.removeItem(AUTH_STORAGE_KEY);
      setState(user ? { user, isAuthenticated: true, isLoading: false, error: null } : signedOut);
    };

    void restore();
  }, [apiBaseUrl, isCognito]);

  const signIn = useCallback(
    async (credentials?: BasicAuthCredentials) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (isCognito) {
        try {
          await cognitoSignIn(); // navigates away
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign-in redirect failed';
          setState({ ...signedOut, error: message });
        }
        return;
      }

      if (!credentials) {
        setState(signedOut);
        return;
      }
      try {
        const user = await signInBasic(apiBaseUrl, credentials);
        sessionStorage.setItem(AUTH_STORAGE_KEY, user.authorization);
        setState({ user, isAuthenticated: true, isLoading: false, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setState({ ...signedOut, error: message });
      }
    },
    [apiBaseUrl, isCognito]
  );

  const signOut = useCallback(async () => {
    await clearOfflineData();
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setState(signedOut);
    if (isCognito) await cognitoSignOut();
  }, [isCognito]);

  return { ...state, signIn, signOut, isCognito };
}
