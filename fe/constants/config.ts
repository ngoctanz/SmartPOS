/**
 * Application configuration constants
 */
export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || "SmartPOS",
  URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  DESCRIPTION: "Ứng dụng quản lý doanh thu gian hàng",

  // API Configuration
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/v1",
    TIMEOUT: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  },

  // Image Upload
  IMAGE: {
    MAX_SIZE: Number(process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE) || 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
    ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
  },

  // LocalStorage Keys (for non-sensitive data only)
  STORAGE_KEYS: {
    USER: "user", // User profile data (non-sensitive)
    ACCESS_TOKEN: "access_token", // Temporary storage during hydration (will be removed)
    THEME: "theme",
    LANGUAGE: "language",
  },

  // Cookie names (must match backend configuration)
  COOKIES: {
    REFRESH_TOKEN: "refreshToken", // HTTP-only cookie set by backend
  },

  // Debounce & Throttle
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 500,

  // Date Format
  DATE_FORMAT: {
    DEFAULT: "DD/MM/YYYY",
    WITH_TIME: "DD/MM/YYYY HH:mm",
    FULL: "DD/MM/YYYY HH:mm:ss",
  },
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const;
