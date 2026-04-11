// ────────────────────────────────────────────────────────────────────────────
// Core API Client — typed, centralized fetch wrapper for the Fragments backend
// Replaces the old untyped api.js with full TypeScript safety
// ────────────────────────────────────────────────────────────────────────────

import type {
  ApiErrorResponse,
  FragmentsListResponse,
  FragmentMutationResponse,
  FragmentInfoResponse,
  FragmentDeleteResponse,
  HealthResponse,
} from '../types';

/** Custom error class that carries the API error shape */
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

/** Configuration for the API client */
interface ApiClientConfig {
  baseUrl: string;
}

/**
 * Build the Authorization header for Basic Auth.
 * In production, this would use a Cognito Bearer token instead.
 */
function buildAuthHeader(token: string): Record<string, string> {
  return { Authorization: `Basic ${token}` };
}

/**
 * Central fetch wrapper with error handling.
 * All responses are validated against the standardized error shape.
 */
async function request<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...buildAuthHeader(token),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // For binary responses (fragment data), return raw response
  if (options.headers && (options.headers as Record<string, string>)['Accept'] === 'raw') {
    return response as unknown as T;
  }

  // Handle non-JSON responses (fragment data like images, raw text)
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json')) {
    if (!response.ok) {
      throw new FragmentsApiError(response.status, response.statusText);
    }
    return response as unknown as T;
  }

  const json = await response.json();

  if (!response.ok) {
    const errorResponse = json as ApiErrorResponse;
    throw new FragmentsApiError(
      errorResponse.error?.code || response.status,
      errorResponse.error?.message || response.statusText
    );
  }

  return json as T;
}

/**
 * Fragments API Client
 * Stateless, configurable, fully typed.
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseUrl } = config;

  return {
    /**
     * GET /v1/fragments
     * List all fragments for the authenticated user.
     */
    async listFragments(token: string, expand = false): Promise<FragmentsListResponse> {
      const query = expand ? '?expand=1' : '';
      return request<FragmentsListResponse>(`${baseUrl}/v1/fragments${query}`, token);
    },

    /**
     * POST /v1/fragments
     * Create a new fragment.
     */
    async createFragment(
      token: string,
      content: string | ArrayBuffer,
      contentType: string
    ): Promise<FragmentMutationResponse> {
      return request<FragmentMutationResponse>(`${baseUrl}/v1/fragments`, token, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: content,
      });
    },

    /**
     * GET /v1/fragments/:id
     * Retrieve fragment data by ID. Returns the raw Response for streaming.
     */
    async getFragmentData(token: string, id: string): Promise<Response> {
      return request<Response>(`${baseUrl}/v1/fragments/${id}`, token, {
        headers: { Accept: 'raw' },
      });
    },

    /**
     * GET /v1/fragments/:id/info
     * Retrieve fragment metadata.
     */
    async getFragmentInfo(token: string, id: string): Promise<FragmentInfoResponse> {
      return request<FragmentInfoResponse>(`${baseUrl}/v1/fragments/${id}/info`, token);
    },

    /**
     * PUT /v1/fragments/:id
     * Update an existing fragment's data.
     */
    async updateFragment(
      token: string,
      id: string,
      content: string | ArrayBuffer,
      contentType: string
    ): Promise<FragmentMutationResponse> {
      return request<FragmentMutationResponse>(`${baseUrl}/v1/fragments/${id}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: content,
      });
    },

    /**
     * DELETE /v1/fragments/:id
     * Delete a fragment.
     */
    async deleteFragment(token: string, id: string): Promise<FragmentDeleteResponse> {
      return request<FragmentDeleteResponse>(`${baseUrl}/v1/fragments/${id}`, token, {
        method: 'DELETE',
      });
    },

    /**
     * GET /v1/fragments/:id.:ext
     * Convert a fragment to a different format.
     */
    async convertFragment(token: string, id: string, ext: string): Promise<Response> {
      return request<Response>(`${baseUrl}/v1/fragments/${id}.${ext}`, token, {
        headers: { Accept: 'raw' },
      });
    },

    /**
     * GET /health
     * Health check (unauthenticated).
     */
    async health(): Promise<HealthResponse> {
      const response = await fetch(`${baseUrl}/health`);
      return response.json() as Promise<HealthResponse>;
    },
  };
}

/** Type for the API client instance */
export type ApiClient = ReturnType<typeof createApiClient>;
