"use client";

import { useCallback, useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { setContextAccessToken, setRefreshTokenFunction } from "@/lib/fetch";

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, refreshAccessToken } = useAuthContext();

  // Sync access token to fetch lib
  useEffect(() => {
    setContextAccessToken(accessToken);
  }, [accessToken]);

  const refreshForApi = useCallback(async () => {
    return refreshAccessToken(true);
  }, [refreshAccessToken]);

  // Sync refresh function to fetch lib
  useEffect(() => {
    setRefreshTokenFunction(refreshForApi);

    return () => {
      setRefreshTokenFunction(null);
    };
  }, [refreshForApi]);

  return <>{children}</>;
}
