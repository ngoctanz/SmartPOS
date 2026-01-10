import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface Branch {
  _id: string;
  branchName: string;
  address: string;
  contactInfo: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // PayOS credentials
  PAYOS_CLIENT_ID?: string;
  PAYOS_API_KEY?: string;
  PAYOS_CHECKSUM_KEY?: string;
}

export interface CreateBranchRequest {
  branchName: string;
  address: string;
  contactInfo: string;
  PAYOS_CLIENT_ID?: string;
  PAYOS_API_KEY?: string;
  PAYOS_CHECKSUM_KEY?: string;
}

export interface BranchStats {
  total: number;
}

export interface UpdateBranchRequest {
  branchName?: string;
  address?: string;
  contactInfo?: string;
  PAYOS_CLIENT_ID?: string;
  PAYOS_API_KEY?: string;
  PAYOS_CHECKSUM_KEY?: string;
}

export interface SearchBranchParams {
  name?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  includeDeleted?: boolean;
}

const branchService = {
  /**
   * Lấy tất cả chi nhánh (có phân trang)
   * GET /api/v1/branch
   */
  getAll: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Branch[]> & { pagination?: Pagination }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.includeDeleted) queryParams.append("includeDeleted", "true");

    const query = queryParams.toString();
    return apiGet<Branch[]>(`/branch${query ? `?${query}` : ""}`);
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
   * Lấy thống kê chi nhánh
   * GET /api/v1/branch/stats
   */
  getStats: async (): Promise<ApiResponse<BranchStats>> => {
    return apiGet<BranchStats>("/branch/stats");
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

  /**
   * Khôi phục chi nhánh đã xóa
   * PATCH /api/v1/branch/:id/restore
   */
  restore: async (id: string): Promise<ApiResponse<Branch>> => {
    return apiPatch<Branch>(`/branch/${id}/restore`);
  },

  /**
   * Kiểm tra chi nhánh có thể xóa vĩnh viễn không
   * GET /api/v1/branch/:id/can-delete
   */
  checkCanDelete: async (
    id: string
  ): Promise<
    ApiResponse<{
      canDelete: boolean;
      hasData: boolean;
      details: {
        receipts: boolean;
        importReceipts: boolean;
        stock: boolean;
        users: boolean;
      };
    }>
  > => {
    return apiGet(`/branch/${id}/can-delete`);
  },

  /**
   * Xóa vĩnh viễn chi nhánh
   * DELETE /api/v1/branch/:id/permanent
   */
  hardDelete: async (id: string): Promise<ApiResponse> => {
    return apiDelete(`/branch/${id}/permanent`);
  },
};

export default branchService;
