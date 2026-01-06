/**
 * API Service - Re-exports từ lib/fetch
 * File này được giữ lại để đảm bảo backward compatibility với các service cũ
 */

import { api, apiFetch, setContextAccessToken, FetchError } from "@/lib/fetch";
import type { ApiResponse, FetchOptions } from "@/lib/fetch";

// Re-export types
export type { ApiResponse, FetchOptions };
export { FetchError };

// Module-level state for backward compatibility
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  setContextAccessToken(token);
};

export const getAccessToken = () => accessToken;

// Re-export API config
export { API_CONFIG, getApiUrl } from "./api.config";

/**
 * API method wrappers for backward compatibility
 * These functions maintain the old interface while using the new fetch lib
 */

export async function apiGet<T = unknown>(
  endpoint: string,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return api.getWithMeta<T>(endpoint, options);
}

export async function apiPost<T = unknown>(
  endpoint: string,
  body?: any,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return api.postWithMeta<T>(endpoint, body, {
    ...options,
    requireAuth: options?.requireAuth ?? true,
  });
}

export async function apiPut<T = unknown>(
  endpoint: string,
  body?: any,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  const response = await api.put<T>(endpoint, body, options);
  return { success: true, data: response };
}

export async function apiPatch<T = unknown>(
  endpoint: string,
  body?: any,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  const response = await api.patch<T>(endpoint, body, options);
  return { success: true, data: response };
}

export async function apiDelete<T = unknown>(
  endpoint: string,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  const response = await api.delete<T>(endpoint, options);
  return { success: true, data: response };
}

// Re-export main fetch function
export { apiFetch };
