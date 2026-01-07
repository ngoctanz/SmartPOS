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


/**
 * User type for SmartPOS
 */
export interface User {
  _id: string;
  userName: string;
  name?: string;
  role: "admin" | "staff";
  branchId?: string;
  isActive: boolean;
}

/**
 * Auth Context Value
 */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
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
 * Auth Provider
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  /**
   * Set authentication data
   */
  const setAuth = useCallback((newUser: User) => {
    setUser(newUser);

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

    // Broadcast to other tabs
    broadcastChannelRef.current?.postMessage({ type: "LOGOUT" } as AuthMessage);
  }, []);

  /**
   * Update user data
   */
  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);

    // Broadcast to other tabs
    broadcastChannelRef.current?.postMessage({
      type: "USER_UPDATE",
      user: newUser,
    } as AuthMessage);
  }, []);

  /**
   * Refresh user data from server (used to init session or update data)
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(
        `${APP_CONFIG.API.BASE_URL}${API_ROUTES.AUTH.ME}`,
        {
          credentials: "include", // Send cookies
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUser(result.data);
          return;
        }
      }
      
      // If we are here, it means we failed to get user (401 or other error)
      // If 401, clear auth (though if we are initing, user is likely null already)
      if (response.status === 401) {
         setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      // Don't clear user here to avoid logging out on network error if we had a user? 
      // But we don't store user in localstorage, so user IS null on init.
    }
  }, []);

  /**
   * Initialize auth state on mount - Check session via cookie
   */
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
      setIsInitialized(true);
    };

    initAuth();
  }, [refreshUser]);

  /**
   * Setup BroadcastChannel for cross-tab sync
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event: MessageEvent<AuthMessage>) => {
        const message = event.data;

        switch (message.type) {
          case "LOGIN":
            setUser(message.user);
            break;

          case "LOGOUT":
            setUser(null);
            break;

          case "USER_UPDATE":
            setUser(message.user);
            break;
        }
      };

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch {
      console.warn("BroadcastChannel not supported");
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    setAuth,
    clearAuth,
    updateUser,
    refreshUser,
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
