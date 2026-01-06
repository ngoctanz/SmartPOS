"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function useRequireAuth(redirectTo = "/dang-nhap") {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, isAuthenticated, router, redirectTo]);

  return { isAuthenticated, loading };
}

export function useRequireRole(
  allowedRoles: Array<"admin" | "manager" | "staff">,
  redirectTo = "/trang-quan-ly"
) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.push(redirectTo);
    }
  }, [loading, user, allowedRoles, router, redirectTo]);

  return {
    user,
    loading,
    hasAccess: user ? allowedRoles.includes(user.role) : false,
  };
}
