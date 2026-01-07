"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/constants/routes";

export function useRequireAuth(redirectTo = ROUTES.AUTH.LOGIN) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isInitialized } = useAuthContext();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isInitialized, isAuthenticated, router, redirectTo]);

  return {
    isLoading: isLoading || !isInitialized,
    loading: isLoading || !isInitialized, // Backwards compatibility
    isAuthenticated,
    user,
  };
}

/**
 * Hook to require specific roles for a page
 * Redirects to dashboard if user doesn't have the required role
 */
export function useRequireRole(
  allowedRoles: Array<"admin" | "staff">,
  redirectTo = ROUTES.DASHBOARD.HOME
) {
  const router = useRouter();
  const { user, isLoading, isInitialized } = useAuthContext();

  useEffect(() => {
    if (!isInitialized) return;

    if (user && !allowedRoles.includes(user.role)) {
      router.replace(redirectTo);
    }
  }, [isInitialized, user, allowedRoles, router, redirectTo]);

  return {
    user,
    isLoading: isLoading || !isInitialized,
    loading: isLoading || !isInitialized, // Backwards compatibility
    hasAccess: user ? allowedRoles.includes(user.role) : false,
  };
}
