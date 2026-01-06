import { getApiUrl, ApiResponse, FetchError } from "./api.config";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  skipRefresh?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(getApiUrl("/auth/refresh_token"), {
      method: "POST",
      credentials: "include", // Important: để gửi cookie
      headers: {
        "Content-Type": "application/json",
      },
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
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    requiresAuth = true,
    skipRefresh = false,
    headers = {},
    ...fetchOptions
  } = options;

  const url = getApiUrl(endpoint);

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Add Authorization header if token exists
  if (requiresAuth && accessToken) {
    defaultHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: defaultHeaders,
      credentials: "include", // Important: để gửi và nhận cookie
    });

    // Handle 401 and try to refresh token
    if (response.status === 401 && !skipRefresh && requiresAuth) {
      const newToken = await refreshAccessToken();

      if (newToken) {
        // Retry with new token
        defaultHeaders["Authorization"] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers: defaultHeaders,
          credentials: "include",
        });

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new FetchError(
            errorData.message || "Request failed",
            retryResponse.status,
            errorData
          );
        }

        return retryResponse.json();
      } else {
        // Redirect to login if refresh fails
        if (typeof window !== "undefined") {
          window.location.href = "/dang-nhap";
        }
        throw new FetchError("Session expired", 401);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FetchError(
        errorData.message || "Request failed",
        response.status,
        errorData
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    throw new FetchError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }
}

// HTTP Methods helpers
export const apiGet = <T = any>(endpoint: string, options?: FetchOptions) =>
  apiFetch<T>(endpoint, { ...options, method: "GET" });

export const apiPost = <T = any>(
  endpoint: string,
  body?: any,
  options?: FetchOptions
) =>
  apiFetch<T>(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiPut = <T = any>(
  endpoint: string,
  body?: any,
  options?: FetchOptions
) =>
  apiFetch<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiPatch = <T = any>(
  endpoint: string,
  body?: any,
  options?: FetchOptions
) =>
  apiFetch<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiDelete = <T = any>(endpoint: string, options?: FetchOptions) =>
  apiFetch<T>(endpoint, { ...options, method: "DELETE" });
