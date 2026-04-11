// ────────────────────────────────────────────────────────────────────────────
// Strict TypeScript interfaces for the Fragments API
// Maps to the standardized backend response shapes from the reliability refactor
// ────────────────────────────────────────────────────────────────────────────

/** Standard error shape returned by all backend endpoints */
export interface ApiError {
  code: number;
  message: string;
}

/** Standard error response envelope */
export interface ApiErrorResponse {
  status: 'error';
  error: ApiError;
}

/** Standard success response envelope (generic over the data payload) */
export interface ApiSuccessResponse {
  status: 'ok';
  [key: string]: unknown;
}

/** Fragment metadata as returned by the backend */
export interface Fragment {
  id: string;
  ownerId: string;
  created: string;
  updated: string;
  type: string;
  size: number;
}

/** Response from GET /v1/fragments */
export interface FragmentsListResponse extends ApiSuccessResponse {
  fragments: Fragment[] | string[];
}

/** Response from POST/PUT /v1/fragments */
export interface FragmentMutationResponse extends ApiSuccessResponse {
  fragment: Fragment;
}

/** Response from GET /v1/fragments/:id/info */
export interface FragmentInfoResponse extends ApiSuccessResponse {
  fragment: Fragment;
}

/** Response from DELETE /v1/fragments/:id */
export interface FragmentDeleteResponse extends ApiSuccessResponse {
  status: 'ok';
}

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'healthy';
  author?: string;
  version?: string;
  githubUrl?: string;
  timestamp?: string;
  uptime?: number;
}

/** Discriminated union for any API response */
export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

/** Type guard: check if a response is an error */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    (response as ApiErrorResponse).status === 'error'
  );
}
