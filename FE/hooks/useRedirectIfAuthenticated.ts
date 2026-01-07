"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/constants/routes";
import { useAuthContext } from "@/contexts/auth-context";

export function useRedirectIfAuthenticated(redirectTo?: string) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isInitialized } = useAuthContext();

  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated && user) {
      const targetUrl = redirectTo ?? ROUTES.DASHBOARD.HOME;
      router.replace(targetUrl);
    }
  }, [isInitialized, isAuthenticated, user, router, redirectTo]);

  return {
    isLoading: isLoading || !isInitialized,
  };
}
