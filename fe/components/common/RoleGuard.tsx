"use client";

import { useAuth } from "@/hooks/useAuth";

export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: {
  children: React.ReactNode;
  allowedRoles: Array<"admin" | "manager" | "staff">;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
