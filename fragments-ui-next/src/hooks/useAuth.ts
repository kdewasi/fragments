// ────────────────────────────────────────────────────────────────────────────
// useAuth — authentication state management hook
// ────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import type { AuthState, BasicAuthCredentials } from '../types';
import { signInBasic, signOut as signOutService, validateSession } from '../services';

const AUTH_TOKEN_KEY = 'fragments_auth_token';

interface UseAuthReturn extends AuthState {
  signIn: (credentials: BasicAuthCredentials) => Promise<void>;
  signOut: () => void;
}

export function useAuth(apiBaseUrl: string): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      validateSession(apiBaseUrl, storedToken)
        .then((user) => {
          if (user) {
            setState({ user, isAuthenticated: true, isLoading: false, error: null });
          } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
          }
        })
        .catch(() => {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
        });
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [apiBaseUrl]);

  const signIn = useCallback(
    async (credentials: BasicAuthCredentials) => {
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
    [apiBaseUrl]
  );

  const signOut = useCallback(() => {
    signOutService();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  }, []);

  return { ...state, signIn, signOut };
}
