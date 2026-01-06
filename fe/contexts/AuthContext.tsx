"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { authService, setAccessToken } from "@/service";
import type { User, LoginRequest } from "@/service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Load user from localStorage on initial render
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      if (response.data?.user) {
        setUser(response.data.user);
        // Save user to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
      }
    } catch (error) {
      console.error("Failed to refresh auth:", error);
      setUser(null);
      setAccessToken(null);
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check auth on mount
    refreshAuth();
  }, [refreshAuth]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      if (response.data?.user) {
        setUser(response.data.user);
        // Save user to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setAccessToken(null);
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
        window.location.href = "/dang-nhap";
      }
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
