// ────────────────────────────────────────────────────────────────────────────
// Core API client — typed, centralized fetch wrapper for the Fragments backend
// ────────────────────────────────────────────────────────────────────────────

import type {
  ApiErrorResponse,
  FragmentsListResponse,
  FragmentMutationResponse,
  FragmentInfoResponse,
  FragmentDeleteResponse,
  HealthResponse,
} from '../types';

/** Error carrying the API's status code and message */
export class FragmentsApiError extends Error {
  public readonly status: number;
  public readonly apiMessage: string;

  constructor(status: number, message: string) {
    super(`[${status}] ${message}`);
    this.name = 'FragmentsApiError';
    this.status = status;
    this.apiMessage = message;
  }
}

interface ApiClientConfig {
  baseUrl: string;
}

interface RequestOptions extends RequestInit {
  /** Return the raw Response instead of parsing JSON (fragment data, conversions) */
  raw?: boolean;
}

async function request<T>(
  url: string,
  authorization: string,
  { raw = false, headers, ...options }: RequestOptions = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: authorization, ...(headers as Record<string, string> | undefined) },
  });

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    if (contentType.includes('json')) {
      const body = (await response.json()) as ApiErrorResponse;
      throw new FragmentsApiError(
        body.error?.code || response.status,
        body.error?.message || response.statusText
      );
    }
    throw new FragmentsApiError(response.status, response.statusText || 'Request failed');
  }

  if (raw) return response as unknown as T;
  return (await response.json()) as T;
}

/**
 * Fragments API client. Stateless: the caller passes the Authorization header
 * value ("Basic ..." or "Bearer ...") to every call.
 */
export function createApiClient({ baseUrl }: ApiClientConfig) {
  const fragmentUrl = (id: string) => `${baseUrl}/v1/fragments/${encodeURIComponent(id)}`;

  return {
    /** GET /v1/fragments — list the user's fragments (ids, or metadata with expand) */
    listFragments(authorization: string, expand = false): Promise<FragmentsListResponse> {
      const query = expand ? '?expand=1' : '';
      return request(`${baseUrl}/v1/fragments${query}`, authorization);
    },

    /** POST /v1/fragments — create a fragment */
    createFragment(
      authorization: string,
      content: string | ArrayBuffer,
      contentType: string
    ): Promise<FragmentMutationResponse> {
      return request(`${baseUrl}/v1/fragments`, authorization, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: content,
      });
    },

    /** GET /v1/fragments/:id — raw fragment data */
    getFragmentData(authorization: string, id: string): Promise<Response> {
      return request(fragmentUrl(id), authorization, { raw: true });
    },

    /** GET /v1/fragments/:id/info — fragment metadata */
    getFragmentInfo(authorization: string, id: string): Promise<FragmentInfoResponse> {
      return request(`${fragmentUrl(id)}/info`, authorization);
    },

    /** PUT /v1/fragments/:id — replace a fragment's data */
    updateFragment(
      authorization: string,
      id: string,
      content: string | ArrayBuffer,
      contentType: string
    ): Promise<FragmentMutationResponse> {
      return request(fragmentUrl(id), authorization, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: content,
      });
    },

    /** DELETE /v1/fragments/:id */
    deleteFragment(authorization: string, id: string): Promise<FragmentDeleteResponse> {
      return request(fragmentUrl(id), authorization, { method: 'DELETE' });
    },

    /** GET /v1/fragments/:id.:ext — converted fragment data */
    convertFragment(authorization: string, id: string, ext: string): Promise<Response> {
      return request(`${fragmentUrl(id)}.${encodeURIComponent(ext)}`, authorization, { raw: true });
    },

    /** GET /health — unauthenticated health check */
    async health(): Promise<HealthResponse> {
      const response = await fetch(`${baseUrl}/health`);
      return (await response.json()) as HealthResponse;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
