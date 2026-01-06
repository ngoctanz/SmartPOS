import { apiPost, setAccessToken } from "./api.service";
import { ApiResponse } from "./api.config";

export interface LoginRequest {
  userName: string;
  password: string;
}

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
      requiresAuth: false,
    });

    // Lưu access token vào memory
    if (response.access_token) {
      setAccessToken(response.access_token);
    }

    return response;
  },

  /**
   * Đăng xuất
   * POST /api/v1/auth/logout
   */
  logout: async (): Promise<ApiResponse> => {
    const response = await apiPost("/auth/logout");

    // Clear access token
    setAccessToken(null);

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
      { requiresAuth: false, skipRefresh: true }
    );

    if (response.access_token) {
      setAccessToken(response.access_token);
    }

    return response;
  },
};

export default authService;
