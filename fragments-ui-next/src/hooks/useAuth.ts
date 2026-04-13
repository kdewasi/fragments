// ────────────────────────────────────────────────────────────────────────────
// useAuth — authentication state management hook
// Supports both Basic Auth (dev) and Cognito OAuth (production)
// ────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import type { AuthState, BasicAuthCredentials } from '../types';
import {
  signInBasic,
  signOut as signOutBasic,
  validateSession,
  getCognitoUser,
  cognitoSignIn,
  cognitoSignOut,
  cognitoHandleCallback,
} from '../services';
import { config } from '../config';

const AUTH_TOKEN_KEY = 'fragments_auth_token';

interface UseAuthReturn extends AuthState {
  /** For Basic Auth: sign in with username/password. For Cognito: redirect to Hosted UI */
  signIn: (credentials?: BasicAuthCredentials) => Promise<void>;
  signOut: () => void;
  /** Whether we're using Cognito auth */
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

  // ── Cognito: handle OAuth callback on page load ─────
  useEffect(() => {
    if (!isCognito) return;

    const handleCognitoAuth = async () => {
      // Check if this is a callback redirect (has ?code= in URL)
      const params = new URLSearchParams(window.location.search);
      if (params.has('code')) {
        try {
          const user = await cognitoHandleCallback();
          setState({ user, isAuthenticated: true, isLoading: false, error: null });
          // Clean up the URL
          window.history.replaceState({}, '', window.location.pathname);
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Cognito callback failed';
          setState({ user: null, isAuthenticated: false, isLoading: false, error: message });
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }

      // Check for existing Cognito session
      try {
        const user = await getCognitoUser();
        if (user) {
          setState({ user, isAuthenticated: true, isLoading: false, error: null });
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
      }
    };

    handleCognitoAuth();
  }, [isCognito]);

  // ── Basic Auth: restore session on mount ────────────
  useEffect(() => {
    if (isCognito) return;

    const restoreSession = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (storedToken) {
        try {
          const user = await validateSession(apiBaseUrl, storedToken);
          if (user) {
            setState({ user, isAuthenticated: true, isLoading: false, error: null });
          } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
          }
        } catch {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
      }
    };
    restoreSession();
  }, [apiBaseUrl, isCognito]);

  const signIn = useCallback(
    async (credentials?: BasicAuthCredentials) => {
      if (isCognito) {
        // Cognito: redirect to Hosted UI
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        try {
          await cognitoSignIn();
          // Page will redirect — don't update state
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign-in redirect failed';
          setState({ user: null, isAuthenticated: false, isLoading: false, error: message });
        }
        return;
      }

      // Basic Auth
      if (!credentials) return;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const user = await signInBasic(apiBaseUrl, credentials);
        localStorage.setItem(AUTH_TOKEN_KEY, user.token);
        setState({ user, isAuthenticated: true, isLoading: false, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setState({ user: null, isAuthenticated: false, isLoading: false, error: message });
      }
    },
    [apiBaseUrl, isCognito]
  );

  const signOut = useCallback(() => {
    if (isCognito) {
      cognitoSignOut();
      return;
    }
    signOutBasic();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  }, [isCognito]);

  return { ...state, signIn, signOut, isCognito };
}
