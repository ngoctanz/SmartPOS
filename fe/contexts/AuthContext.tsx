"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { authService, setAccessToken } from "@/service";
import type { User as AuthUser, LoginRequest } from "@/service/auth.service";

// Constants
const REFRESH_THROTTLE_MS = 30_000; // 30 seconds
const USER_STORAGE_KEY = "user";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for localStorage
const saveUserToStorage = (user: AuthUser) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // localStorage might be full or disabled
  }
};

const clearUserFromStorage = () => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Load user from localStorage on initial render (client-side only)
    if (typeof window === "undefined") return null;
    return loadUserFromStorage();
  });
  const [loading, setLoading] = useState(true);

  // Refs for tracking state without causing re-renders
  const lastRefreshTimeRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const userRef = useRef<AuthUser | null>(user);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshAuth = useCallback(async () => {
    // Prevent concurrent refresh calls
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;

    try {
      const response = await authService.refreshToken();
      if (response.data?.user) {
        setUser(response.data.user);
        saveUserToStorage(response.data.user);
      }
      // Update last refresh time on success
      lastRefreshTimeRef.current = Date.now();
    } catch (error) {
      console.error("Failed to refresh auth:", error);
      setUser(null);
      setAccessToken(null);
      clearUserFromStorage();
    } finally {
      isRefreshingRef.current = false;
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    if (response.data?.user) {
      setUser(response.data.user);
      saveUserToStorage(response.data.user);
      lastRefreshTimeRef.current = Date.now();
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setAccessToken(null);
      clearUserFromStorage();
      // Use replace to prevent back navigation to protected page
      window.location.replace("/dang-nhap");
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Auto-refresh auth when tab becomes visible again (throttled)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refresh if tab is visible and user was logged in
      if (document.visibilityState !== "visible") return;
      if (!userRef.current) return;

      const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;

      // Only refresh if throttle time has passed
      if (timeSinceLastRefresh >= REFRESH_THROTTLE_MS) {
        refreshAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshAuth]); // Only depends on refreshAuth, not user

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshAuth,
    }),
    [user, loading, login, logout, refreshAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
