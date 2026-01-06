import { getApiUrl, ApiResponse, FetchError, API_CONFIG } from "./api.config";

// Module-level state
let accessToken: string | null = null;
let refreshTokenPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  skipRefresh?: boolean;
  timeout?: number;
}

/**
 * Creates an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Refresh access token using refresh token from cookie
 * Returns the new access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  // If a refresh is already in progress, return the same promise (deduplication)
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    try {
      const response = await fetch(getApiUrl("/auth/refresh_token"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return null;
      }

      const data: ApiResponse = await response.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      // Reset the promise after completion
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}

/**
 * Build headers for the request
 */
function buildHeaders(
  customHeaders: HeadersInit = {},
  includeAuth: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (includeAuth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * Execute a fetch request with the given options
 */
async function executeFetch(
  url: string,
  headers: Record<string, string>,
  fetchOptions: RequestInit,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include",
    signal,
  });
}

/**
 * Parse error response safely
 */
async function parseErrorResponse(response: Response): Promise<{
  message: string;
  data: Record<string, unknown>;
}> {
  try {
    const data = await response.json();
    return {
      message: data.message || "Request failed",
      data,
    };
  } catch {
    return {
      message: "Request failed",
      data: {},
    };
  }
}

/**
 * Main API fetch function with automatic token refresh
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    requiresAuth = true,
    skipRefresh = false,
    timeout = API_CONFIG.TIMEOUT,
    headers: customHeaders = {},
    signal: externalSignal,
    ...fetchOptions
  } = options;

  const url = getApiUrl(endpoint);
  const headers = buildHeaders(customHeaders, requiresAuth);

  // Setup timeout if no external signal provided
  let timeoutController: ReturnType<typeof createTimeoutController> | null =
    null;
  let signal = externalSignal;

  if (!signal && timeout > 0) {
    timeoutController = createTimeoutController(timeout);
    signal = timeoutController.controller.signal;
  }

  // Convert null to undefined for AbortSignal
  const abortSignal = signal ?? undefined;

  try {
    const response = await executeFetch(
      url,
      headers,
      fetchOptions,
      abortSignal
    );

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && !skipRefresh && requiresAuth) {
      const newToken = await refreshAccessToken();

      if (newToken) {
        // Retry with new token
        const retryHeaders = buildHeaders(customHeaders, true);
        const retryResponse = await executeFetch(
          url,
          retryHeaders,
          fetchOptions,
          abortSignal
        );

        if (!retryResponse.ok) {
          const { message, data } = await parseErrorResponse(retryResponse);
          throw new FetchError(message, retryResponse.status, data);
        }

        return retryResponse.json();
      }

      // Refresh failed - let AuthContext handle the redirect
      // Don't redirect here to avoid conflicts with AuthContext
      throw new FetchError("Session expired", 401);
    }

    // Handle other error responses
    if (!response.ok) {
      const { message, data } = await parseErrorResponse(response);
      throw new FetchError(message, response.status, data);
    }

    return response.json();
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FetchError("Request timeout", 408);
    }

    // Re-throw FetchError as-is
    if (error instanceof FetchError) {
      throw error;
    }

    // Wrap other errors
    throw new FetchError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  } finally {
    // Clear timeout if we created one
    if (timeoutController) {
      clearTimeout(timeoutController.timeoutId);
    }
  }
}

// ============================================
// HTTP Method Helpers
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequestBody = any;

export function apiGet<T = unknown>(
  endpoint: string,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { ...options, method: "GET" });
}

export function apiPost<T = unknown>(
  endpoint: string,
  body?: RequestBody,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: "POST",
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T = unknown>(
  endpoint: string,
  body?: RequestBody,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T = unknown>(
  endpoint: string,
  body?: RequestBody,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T = unknown>(
  endpoint: string,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { ...options, method: "DELETE" });
}
