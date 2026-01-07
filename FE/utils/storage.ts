import { APP_CONFIG } from "@/constants/config";

/**
 * LocalStorage utility with error handling
 */
export const storage = {
  /**
   * Get item from localStorage
   */
  get<T = any>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return null;
    }
  },

  /**
   * Set item to localStorage
   */
  set<T = any>(key: string, value: T): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} to localStorage:`, error);
    }
  },

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  },

  /**
   * Check if key exists in localStorage
   */
  has(key: string): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) !== null;
  },
};

/**
 * Get access token
 */
export function getAccessToken(): string | null {
  return storage.get<string>(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Set access token
 */
export function setAccessToken(token: string): void {
  storage.set(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
}

/**
 * Remove access token
 */
export function removeAccessToken(): void {
  storage.remove(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Clear all auth data
 */
export function clearAuthTokens(): void {
  removeAccessToken();
  storage.remove(APP_CONFIG.STORAGE_KEYS.USER);
}
