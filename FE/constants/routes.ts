/**
 * Application route paths
 */
export const ROUTES = {
  HOME: "/",

  // Auth routes
  AUTH: {
    LOGIN: "/dang-nhap",
  },

  // Dashboard/Management routes
  DASHBOARD: {
    HOME: "/trang-quan-ly",
    PRODUCTS: "/trang-quan-ly/san-pham",
    PRODUCT_TYPES: "/trang-quan-ly/loai-san-pham",
    IMPORTS: "/trang-quan-ly/nhap-hang",
    INVOICES: "/trang-quan-ly/hoa-don",
    USERS: "/trang-quan-ly/nguoi-dung",
    BRANCHES: "/trang-quan-ly/chi-nhanh",
  },
} as const;

/**
 * API route paths
 */
export const API_ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh_token",
    ME: "/auth/me",
    CHANGE_PASSWORD: "/auth/change-password",
  },

  USERS: {
    LIST: "/users",
    DETAIL: (id: string) => `/users/${id}`,
    CREATE: "/users",
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },

  BRANCHES: {
    LIST: "/branches",
    DETAIL: (id: string) => `/branches/${id}`,
    CREATE: "/branches",
    UPDATE: (id: string) => `/branches/${id}`,
    DELETE: (id: string) => `/branches/${id}`,
  },

  CATEGORIES: {
    LIST: "/categories",
    DETAIL: (id: string) => `/categories/${id}`,
    CREATE: "/categories",
    UPDATE: (id: string) => `/categories/${id}`,
    DELETE: (id: string) => `/categories/${id}`,
  },

  PRODUCTS: {
    LIST: "/products",
    DETAIL: (id: string) => `/products/${id}`,
    CREATE: "/products",
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
  },

  RECEIPTS: {
    LIST: "/receipts",
    DETAIL: (id: string) => `/receipts/${id}`,
    CREATE: "/receipts",
  },

  IMPORT_RECEIPTS: {
    LIST: "/import-receipts",
    DETAIL: (id: string) => `/import-receipts/${id}`,
    CREATE: "/import-receipts",
  },

  STOCK: {
    LIST: "/stock",
    BY_BRANCH: (branchId: string) => `/stock/branch/${branchId}`,
  },

  DASHBOARD: {
    SUMMARY: "/dashboard/summary",
    STATS: "/dashboard/stats",
  },

  UPLOAD: {
    SINGLE: "/upload",
    MULTIPLE: "/upload/multiple",
  },
} as const;
