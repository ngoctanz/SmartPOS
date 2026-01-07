"use client";

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  // Authentication is now handled via cookies, no sync needed.
  return <>{children}</>;
}
