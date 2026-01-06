import { apiGet, apiPost, apiPatch, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";
import type { User, UserRole, UserStatus } from "@/types/user";

export type { User };

export interface CreateUserRequest {
  userName: string;
  password: string;
  name?: string;
  role?: UserRole;
  branchId?: string;
  status?: UserStatus;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  branchId?: string;
  status?: UserStatus;
}

export interface SearchUserParams {
  name?: string;
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
   * Tìm kiếm người dùng theo tên
   * GET /v1/user/search?name=xxx
   */
  search: async (params: SearchUserParams): Promise<ApiResponse<User[]>> => {
    const queryParams = new URLSearchParams();
    if (params.name) queryParams.append("name", params.name);

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

  /**
   * Xóa người dùng (soft delete)
   * DELETE /api/v1/user/:id
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiDelete<void>(`/user/${id}`);
  },

  /**
   * Toggle trạng thái người dùng (khóa/mở khóa)
   * PATCH /api/v1/user/toggle-status/:id
   */
  toggleStatus: async (id: string): Promise<ApiResponse<User>> => {
    return apiPatch<User>(`/user/toggle-status/${id}`);
  },

  /**
   * Thay đổi trạng thái nhiều người dùng
   * POST /api/v1/user/bulk-toggle-status
   */
  bulkToggleStatus: async (
    ids: string[],
    status: UserStatus
  ): Promise<ApiResponse<{ modifiedCount: number }>> => {
    return apiPost<{ modifiedCount: number }>("/user/bulk-toggle-status", {
      ids,
      status,
    });
  },
};

export default userService;
