// ────────────────────────────────────────────────────────────────────────────
// useFragments — CRUD operations for fragments with loading/error states
// Includes IndexedDB caching for offline support
// ────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react';
import type { Fragment } from '../types';
import {
  createApiClient,
  FragmentsApiError,
  cacheFragments,
  getCachedFragments,
  removeCachedFragmentData,
} from '../services';

interface UseFragmentsState {
  fragments: Fragment[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
}

interface UseFragmentsReturn extends UseFragmentsState {
  loadFragments: () => Promise<void>;
  createFragment: (content: string | ArrayBuffer, contentType: string) => Promise<Fragment | null>;
  deleteFragment: (id: string) => Promise<boolean>;
  updateFragment: (id: string, content: string | ArrayBuffer, contentType: string) => Promise<Fragment | null>;
  getFragmentInfo: (id: string) => Promise<Fragment | null>;
  clearError: () => void;
}

export function useFragments(apiBaseUrl: string, token: string | null): UseFragmentsReturn {
  const [state, setState] = useState<UseFragmentsState>({
    fragments: [],
    isLoading: false,
    error: null,
    isOffline: false,
  });

  const api = useMemo(() => createApiClient({ baseUrl: apiBaseUrl }), [apiBaseUrl]);

  const setLoading = (isLoading: boolean) =>
    setState((prev) => ({ ...prev, isLoading, error: isLoading ? null : prev.error }));

  const setError = (error: string) =>
    setState((prev) => ({ ...prev, isLoading: false, error }));

  const clearError = useCallback(() =>
    setState((prev) => ({ ...prev, error: null })), []);

  const loadFragments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api.listFragments(token, true);
      const fragments = (response.fragments || []) as Fragment[];
      // Cache to IndexedDB for offline use
      cacheFragments(fragments);
      setState({ fragments, isLoading: false, error: null, isOffline: false });
    } catch (err) {
      // Try offline fallback
      if (!navigator.onLine) {
        const cached = await getCachedFragments();
        if (cached.length > 0) {
          setState({
            fragments: cached,
            isLoading: false,
            error: 'Offline — showing cached fragments',
            isOffline: true,
          });
          return;
        }
      }
      const message = err instanceof FragmentsApiError
        ? err.apiMessage
        : 'Failed to load fragments';
      setError(message);
    }
  }, [token, api]);

  const createFragment = useCallback(
    async (content: string | ArrayBuffer, contentType: string): Promise<Fragment | null> => {
      if (!token) return null;
      setLoading(true);
      try {
        const response = await api.createFragment(token, content, contentType);
        // Refresh list after creation
        const listResponse = await api.listFragments(token, true);
        const fragments = (listResponse.fragments || []) as Fragment[];
        cacheFragments(fragments);
        setState({ fragments, isLoading: false, error: null, isOffline: false });
        return response.fragment;
      } catch (err) {
        const message = err instanceof FragmentsApiError
          ? err.apiMessage
          : 'Failed to create fragment';
        setError(message);
        return null;
      }
    },
    [token, api]
  );

  const deleteFragment = useCallback(
    async (id: string): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      try {
        await api.deleteFragment(token, id);
        removeCachedFragmentData(id);
        // Refresh list after deletion
        const listResponse = await api.listFragments(token, true);
        const fragments = (listResponse.fragments || []) as Fragment[];
        cacheFragments(fragments);
        setState({ fragments, isLoading: false, error: null, isOffline: false });
        return true;
      } catch (err) {
        const message = err instanceof FragmentsApiError
          ? err.apiMessage
          : 'Failed to delete fragment';
        setError(message);
        return false;
      }
    },
    [token, api]
  );

  const updateFragment = useCallback(
    async (id: string, content: string | ArrayBuffer, contentType: string): Promise<Fragment | null> => {
      if (!token) return null;
      setLoading(true);
      try {
        const response = await api.updateFragment(token, id, content, contentType);
        // Refresh list after update
        const listResponse = await api.listFragments(token, true);
        const fragments = (listResponse.fragments || []) as Fragment[];
        cacheFragments(fragments);
        setState({ fragments, isLoading: false, error: null, isOffline: false });
        return response.fragment;
      } catch (err) {
        const message = err instanceof FragmentsApiError
          ? err.apiMessage
          : 'Failed to update fragment';
        setError(message);
        return null;
      }
    },
    [token, api]
  );

  const getFragmentInfo = useCallback(
    async (id: string): Promise<Fragment | null> => {
      if (!token) return null;
      try {
        const response = await api.getFragmentInfo(token, id);
        return response.fragment;
      } catch (err) {
        const message = err instanceof FragmentsApiError
          ? err.apiMessage
          : 'Failed to get fragment info';
        setError(message);
        return null;
      }
    },
    [token, api]
  );

  return {
    ...state,
    loadFragments,
    createFragment,
    deleteFragment,
    updateFragment,
    getFragmentInfo,
    clearError,
  };
}
