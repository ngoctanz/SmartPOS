import { apiGet, apiPost, apiPut, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface Branch {
  _id: string;
  branchName: string;
  address: string;
  contactInfo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchRequest {
  branchName: string;
  address: string;
  contactInfo: string;
}

export interface UpdateBranchRequest {
  branchName?: string;
  address?: string;
  contactInfo?: string;
}

export interface SearchBranchParams {
  name?: string;
}

const branchService = {
  /**
   * Lấy tất cả chi nhánh
   * GET /api/v1/branch
   */
  getAll: async (): Promise<ApiResponse<Branch[]>> => {
    return apiGet<Branch[]>("/branch");
  },

  /**
   * Tìm kiếm chi nhánh
   * GET /api/v1/branch/search
   */
  search: async (
    params: SearchBranchParams
  ): Promise<ApiResponse<Branch[]>> => {
    const queryParams = new URLSearchParams();
    if (params.name) queryParams.append("name", params.name);

    return apiGet<Branch[]>(`/branch/search?${queryParams.toString()}`);
  },

  /**
   * Lấy chi tiết chi nhánh
   * GET /api/v1/branch/:id
   */
  getById: async (id: string): Promise<ApiResponse<Branch>> => {
    return apiGet<Branch>(`/branch/${id}`);
  },

  /**
   * Tạo chi nhánh mới
   * POST /api/v1/branch
   */
  create: async (data: CreateBranchRequest): Promise<ApiResponse<Branch>> => {
    return apiPost<Branch>("/branch", data);
  },

  /**
   * Cập nhật chi nhánh
   * PUT /api/v1/branch/:id
   */
  update: async (
    id: string,
    data: UpdateBranchRequest
  ): Promise<ApiResponse<Branch>> => {
    return apiPut<Branch>(`/branch/${id}`, data);
  },

  /**
   * Xóa chi nhánh
   * DELETE /api/v1/branch/:id
   */
  remove: async (id: string): Promise<ApiResponse> => {
    return apiDelete(`/branch/${id}`);
  },

  /**
   * Xóa nhiều chi nhánh
   * POST /api/v1/branch/delete-many
   */
  deleteMany: async (ids: string[]): Promise<ApiResponse> => {
    return apiPost("/branch/delete-many", { ids });
  },
};

export default branchService;
