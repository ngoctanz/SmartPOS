"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/auth-context";
import { API_ROUTES, ROUTES } from "@/constants/routes";
import { api } from "@/lib/fetch";
import type { User } from "@/contexts/auth-context";

/**
 * Auth Response from API
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

/**
 * Login payload
 */
export interface LoginPayload {
  userName: string;
  password: string;
}

/**
 * Change password payload
 */
export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

/**
 * Use Auth Hook
 * Wrapper around useAuthContext with additional utilities
 */
export function useAuth() {
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    isInitialized,
    setAuth,
    clearAuth,
    updateUser,
    refreshUser,
    refreshAccessToken,
  } = useAuthContext();

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    isInitialized,
    // Backwards compatibility
    loading: isLoading,
    setAuth,
    clearAuth,
    updateUser,
    refreshUser,
    refreshAccessToken,
  };
}

/**
 * Use Login Hook
 */
export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const login = async (payload: LoginPayload) => {
    const response = await api.postWithMeta<{ user: User }>(
      API_ROUTES.AUTH.LOGIN,
      payload,
      {
        requireAuth: false,
      }
    );

    if (response.success && response.data?.user && response.access_token) {
      setAuth(response.data.user, response.access_token);
      router.push(ROUTES.DASHBOARD.HOME);
      return response;
    }

    throw new Error(response.message || "Login failed");
  };

  return { login };
}

/**
 * Use Logout Hook
 */
export function useLogout() {
  const router = useRouter();
  const { clearAuth } = useAuth();

  const logout = async () => {
    try {
      await api.post(API_ROUTES.AUTH.LOGOUT, undefined, { skipRefresh: true });
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      clearAuth();
      router.push(ROUTES.AUTH.LOGIN);
    }
  };

  return { logout };
}

export default useAuth;
