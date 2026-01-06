import { apiGet, apiPost, apiPut, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface SearchCategoryParams {
  keyword?: string;
  isActive?: boolean;
}


export interface PaginationParams {
  page?: number;
  limit?: number;
}

const categoryService = {
  /**
   * Lấy tất cả loại sản phẩm
   * GET /api/v1/category
   */
  getAll: async (params?: PaginationParams): Promise<ApiResponse<Category[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    
    return apiGet<Category[]>(`/category?${queryParams.toString()}`);
  },

  /**
   * Tìm kiếm loại sản phẩm
   * GET /api/v1/category/search
   */
  search: async (
    params: SearchCategoryParams & PaginationParams
  ): Promise<ApiResponse<Category[]>> => {
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append("keyword", params.keyword);
    if (params.isActive !== undefined)
      queryParams.append("isActive", String(params.isActive));
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return apiGet<Category[]>(`/category/search?${queryParams.toString()}`);
  },

  /**
   * Lấy chi tiết loại sản phẩm
   * GET /api/v1/category/:id
   */
  getById: async (id: string): Promise<ApiResponse<Category>> => {
    return apiGet<Category>(`/category/${id}`);
  },

  /**
   * Tạo loại sản phẩm mới
   * POST /api/v1/category
   */
  create: async (
    data: CreateCategoryRequest
  ): Promise<ApiResponse<Category>> => {
    return apiPost<Category>("/category", data);
  },

  /**
   * Cập nhật loại sản phẩm
   * PUT /api/v1/category/:id
   */
  update: async (
    id: string,
    data: UpdateCategoryRequest
  ): Promise<ApiResponse<Category>> => {
    return apiPut<Category>(`/category/${id}`, data);
  },

  /**
   * Xóa loại sản phẩm
   * DELETE /api/v1/category/:id
   */
  remove: async (id: string): Promise<ApiResponse> => {
    return apiDelete(`/category/${id}`);
  },

  /**
   * Xóa nhiều loại sản phẩm
   * POST /api/v1/category/delete-many
   */
  deleteMany: async (ids: string[]): Promise<ApiResponse> => {
    return apiPost("/category/delete-many", { ids });
  },
};

export default categoryService;
