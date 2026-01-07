import { apiPost } from "./api.service";
import { ApiResponse } from "./api.config";

export interface LoginRequest {
  userName: string;
  password: string;
}

// Basic user info returned from auth endpoints
export interface User {
  _id: string;
  userName: string;
  name?: string;
  role: "admin" | "staff";
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
    return response;
  }
};

export default authService;
