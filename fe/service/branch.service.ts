import { apiGet, apiPost, apiPut, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface Branch {
  _id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchRequest {
  name: string;
  address: string;
  phone: string;
}

export interface UpdateBranchRequest {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface SearchBranchParams {
  keyword?: string;
  isActive?: boolean;
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
    if (params.keyword) queryParams.append("keyword", params.keyword);
    if (params.isActive !== undefined)
      queryParams.append("isActive", String(params.isActive));

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
};

export default branchService;
