"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { APP_CONFIG } from "@/constants/config";
import { API_ROUTES } from "@/constants/routes";
import { storage } from "@/utils/storage";

/**
 * User type for SmartPOS
 */
export interface User {
  _id: string;
  userName: string;
  name?: string;
  role: "admin" | "manager" | "staff";
  branchId?: string;
  isActive: boolean;
}

type CachedUser = Pick<User, "userName" | "name" | "role" | "branchId">;

/**
 * Filter user data to only keep essential fields for localStorage
 */
function filterUserForStorage(user: User): CachedUser {
  return {
    userName: user.userName,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
  };
}

/**
 * Auth Context Value
 */
interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  refreshAccessToken: (shouldClearOnFail?: boolean) => Promise<string | null>;
}

/**
 * Auth Context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * BroadcastChannel for cross-tab communication
 */
const AUTH_CHANNEL_NAME = "smartpos_auth_channel";

type AuthMessage =
  | { type: "LOGIN"; user: User }
  | { type: "LOGOUT" }
  | { type: "USER_UPDATE"; user: User };

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Refresh token promise singleton to prevent multiple simultaneous refresh calls
 */
let refreshPromise: Promise<{ accessToken: string; user: User } | null> | null =
  null;

/**
 * Call refresh token API
 */
async function callRefreshTokenAPI(): Promise<{
  accessToken: string;
  user: User;
} | null> {
  try {
    const response = await fetch(
      `${APP_CONFIG.API.BASE_URL}${API_ROUTES.AUTH.REFRESH}`,
      {
        method: "POST",
        credentials: "include", // Include HTTP-only refresh token cookie
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (result.success && result.data) {
      return {
        accessToken: result.access_token || result.data.accessToken,
        user: result.data.user || result.data,
      };
    }
    // Handle legacy response format
    if (result.access_token && result.data?.user) {
      return {
        accessToken: result.access_token,
        user: result.data.user,
      };
    }
    if (result.access_token && result.data) {
      return {
        accessToken: result.access_token,
        user: result.data,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Singleton refresh to prevent race conditions
 */
export async function refreshTokenSingleton(): Promise<{
  accessToken: string;
  user: User;
} | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = callRefreshTokenAPI().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Auth Provider
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  /**
   * Set authentication data (memory only for access token)
   */
  const setAuth = useCallback((newUser: User, newAccessToken: string) => {
    setUser(newUser);
    setAccessToken(newAccessToken);

    // Only persist minimal user data to localStorage (non-sensitive)
    storage.set(APP_CONFIG.STORAGE_KEYS.USER, filterUserForStorage(newUser));
    // Remove access token from localStorage (security)
    storage.remove(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);

    // Broadcast to other tabs
    broadcastChannelRef.current?.postMessage({
      type: "LOGIN",
      user: newUser,
    } as AuthMessage);
  }, []);

  /**
   * Clear authentication data
   */
  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    storage.remove(APP_CONFIG.STORAGE_KEYS.USER);
    storage.remove(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);

    // Broadcast to other tabs
    broadcastChannelRef.current?.postMessage({ type: "LOGOUT" } as AuthMessage);
  }, []);

  /**
   * Update user data
   */
  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);
    // Only persist minimal user data to localStorage
    storage.set(APP_CONFIG.STORAGE_KEYS.USER, filterUserForStorage(newUser));

    // Broadcast to other tabs
    broadcastChannelRef.current?.postMessage({
      type: "USER_UPDATE",
      user: newUser,
    } as AuthMessage);
  }, []);

  const refreshAccessToken = useCallback(
    async (shouldClearOnFail = true): Promise<string | null> => {
      const result = await refreshTokenSingleton();
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
        // Only persist minimal user data to localStorage
        storage.set(
          APP_CONFIG.STORAGE_KEYS.USER,
          filterUserForStorage(result.user)
        );
        return result.accessToken;
      }
      if (shouldClearOnFail) {
        clearAuth();
      }
      return null;
    },
    [clearAuth]
  );

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${APP_CONFIG.API.BASE_URL}${API_ROUTES.AUTH.ME}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          updateUser(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  }, [accessToken, updateUser]);

  /**
   * Initialize auth state on mount - Silent refresh
   */
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      // Load cached user for immediate UI (prevents flash)
      const cachedUser = storage.get<User>(APP_CONFIG.STORAGE_KEYS.USER);
      if (cachedUser) {
        setUser(cachedUser);
      }

      const result = await refreshTokenSingleton();
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
        // Only persist minimal user data to localStorage
        storage.set(
          APP_CONFIG.STORAGE_KEYS.USER,
          filterUserForStorage(result.user)
        );
      } else {
        setUser(null);
        setAccessToken(null);
        storage.remove(APP_CONFIG.STORAGE_KEYS.USER);
      }

      // Clean up old access token from localStorage if exists
      storage.remove(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);

      setIsLoading(false);
      setIsInitialized(true);
    };

    initAuth();
  }, []);

  /**
   * Setup BroadcastChannel for cross-tab sync
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      channel.onmessage = async (event: MessageEvent<AuthMessage>) => {
        const message = event.data;

        switch (message.type) {
          case "LOGIN":
            setUser(message.user);
            // This tab needs to get its own access token
            // Don't clear on fail - the other tab already logged in successfully
            await refreshAccessToken(false);
            break;

          case "LOGOUT":
            setUser(null);
            setAccessToken(null);
            storage.remove(APP_CONFIG.STORAGE_KEYS.USER);
            break;

          case "USER_UPDATE":
            setUser(message.user);
            // Only persist minimal user data to localStorage
            storage.set(
              APP_CONFIG.STORAGE_KEYS.USER,
              filterUserForStorage(message.user)
            );
            break;
        }
      };

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported
      console.warn("BroadcastChannel not supported");
    }
  }, [refreshAccessToken]);

  /**
   * Auto-refresh access token before expiry (every 13 minutes for 15-min token)
   */
  useEffect(() => {
    if (!accessToken || !isInitialized) return;

    const REFRESH_INTERVAL = 13 * 60 * 1000; // 13 minutes

    const intervalId = setInterval(async () => {
      await refreshAccessToken();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [accessToken, isInitialized, refreshAccessToken]);

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    isInitialized,
    setAuth,
    clearAuth,
    updateUser,
    refreshUser,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Use Auth Hook
 * Access auth context in components
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
