// ────────────────────────────────────────────────────────────────────────────
// useFragments — CRUD operations for fragments with loading/error states
// ────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import type { Fragment } from '../types';
import { createApiClient, FragmentsApiError } from '../services';
import type { ApiClient } from '../services';

interface UseFragmentsState {
  fragments: Fragment[];
  isLoading: boolean;
  error: string | null;
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
  });

  const api: ApiClient = createApiClient({ baseUrl: apiBaseUrl });

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
      setState({ fragments, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof FragmentsApiError
        ? err.apiMessage
        : 'Failed to load fragments';
      setError(message);
    }
  }, [token]);

  const createFragment = useCallback(
    async (content: string | ArrayBuffer, contentType: string): Promise<Fragment | null> => {
      if (!token) return null;
      setLoading(true);
      try {
        const response = await api.createFragment(token, content, contentType);
        // Refresh list after creation
        const listResponse = await api.listFragments(token, true);
        const fragments = (listResponse.fragments || []) as Fragment[];
        setState({ fragments, isLoading: false, error: null });
        return response.fragment;
      } catch (err) {
        const message = err instanceof FragmentsApiError
          ? err.apiMessage
          : 'Failed to create fragment';
        setError(message);
        return null;
      }
    },
    [token]
  );

  const deleteFragment = useCallback(
    async (id: string): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      try {
        await api.deleteFragment(token, id);
        // Refresh list after deletion
        const listResponse = await api.listFragments(token, true);
        const fragments = (listResponse.fragments || []) as Fragment[];
        setState({ fragments, isLoading: false, error: null });
        return true;
      } catch (err) {
        const message = err instanceof FragmentsApiError
          ? err.apiMessage
          : 'Failed to delete fragment';
        setError(message);
        return false;
      }
    },
    [token]
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
        setState({ fragments, isLoading: false, error: null });
        return response.fragment;
      } catch (err) {
        const message = err instanceof FragmentsApiError
          ? err.apiMessage
          : 'Failed to update fragment';
        setError(message);
        return null;
      }
    },
    [token]
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
    [token]
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
