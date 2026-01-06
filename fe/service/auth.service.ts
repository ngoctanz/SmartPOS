import { apiPost } from "./api.service";
import { ApiResponse } from "./api.config";
import { setContextAccessToken } from "@/lib/fetch";

export interface LoginRequest {
  userName: string;
  password: string;
}

// Basic user info returned from auth endpoints
export interface User {
  _id: string;
  userName: string;
  name?: string;
  role: "admin" | "manager" | "staff";
  branchId?: string;
  isActive: boolean;
}

export interface LoginResponse {
  user: User;
}

const authService = {
  /**
   * Đăng nhập
   * POST /api/v1/auth/login
   */
  login: async (
    credentials: LoginRequest
  ): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiPost<LoginResponse>("/auth/login", credentials, {
      requireAuth: false,
    });

    // Lưu access token vào context
    if (response.access_token) {
      setContextAccessToken(response.access_token);
    }

    return response;
  },

  /**
   * Đăng xuất
   * POST /api/v1/auth/logout
   */
  logout: async (): Promise<ApiResponse> => {
    const response = await apiPost("/auth/logout", undefined, {
      skipRefresh: true,
    });

    // Clear access token
    setContextAccessToken(null);

    return response;
  },

  /**
   * Refresh token
   * POST /api/v1/auth/refresh_token
   */
  refreshToken: async (): Promise<ApiResponse> => {
    const response = await apiPost(
      "/auth/refresh_token",
      {},
      { requireAuth: false, skipRefresh: true }
    );

    if (response.access_token) {
      setContextAccessToken(response.access_token);
    }

    return response;
  },
};

export default authService;
