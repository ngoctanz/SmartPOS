"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface PublicRouteProps {
  children: React.ReactNode;
  redirectIfAuthenticated?: boolean;
  redirectTo?: string;
}

export function PublicRoute({
  children,
  redirectIfAuthenticated = true,
  redirectTo = "/trang-quan-ly",
}: PublicRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && redirectIfAuthenticated && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, isAuthenticated, redirectIfAuthenticated, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (redirectIfAuthenticated && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
