import { apiGet, apiPost, apiPatch } from "./api.service";
import { ApiResponse } from "./api.config";

export interface User {
  _id: string;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "staff";
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "staff";
  branchId?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  password?: string;
  role?: "admin" | "manager" | "staff";
  branchId?: string;
  isActive?: boolean;
}

export interface SearchUserParams {
  keyword?: string;
  role?: string;
  branchId?: string;
}

const userService = {
  /**
   * Lấy tất cả người dùng
   * GET /api/v1/user
   */
  getAll: async (): Promise<ApiResponse<User[]>> => {
    return apiGet<User[]>("/user");
  },

  /**
   * Tìm kiếm người dùng
   * GET /api/v1/user/search
   */
  search: async (params: SearchUserParams): Promise<ApiResponse<User[]>> => {
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append("keyword", params.keyword);
    if (params.role) queryParams.append("role", params.role);
    if (params.branchId) queryParams.append("branchId", params.branchId);

    return apiGet<User[]>(`/user/search?${queryParams.toString()}`);
  },

  /**
   * Lấy chi tiết người dùng
   * GET /api/v1/user/:id
   */
  getById: async (id: string): Promise<ApiResponse<User>> => {
    return apiGet<User>(`/user/${id}`);
  },

  /**
   * Tạo người dùng mới
   * POST /api/v1/user
   */
  create: async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
    return apiPost<User>("/user", data);
  },

  /**
   * Cập nhật người dùng
   * PATCH /api/v1/user/update/:id
   */
  update: async (
    id: string,
    data: UpdateUserRequest
  ): Promise<ApiResponse<User>> => {
    return apiPatch<User>(`/user/update/${id}`, data);
  },
};

export default userService;
