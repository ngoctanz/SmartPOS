import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface Product {
  _id: string;
  name: string;
  barcode?: string;
  categoryId: string | { _id: string; name: string };
  unit: string;
  currentSalePrice: number;
  status: "active" | "inactive";
  desc?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  barcode?: string;
  categoryId: string;
  unit: string;
  currentSalePrice: number;
  status?: "active" | "inactive";
  desc?: string;
  images?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  barcode?: string;
  categoryId?: string;
  unit?: string;
  currentSalePrice?: number;
  status?: "active" | "inactive";
  desc?: string;
  images?: string[];
}

export interface UpdatePriceRequest {
  salePrice: number;
}

export interface SearchProductParams {
  name?: string; // Search by name or barcode
  categoryId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
}

const productService = {
  /**
   * Lấy thống kê sản phẩm
   * GET /api/v1/product/stats
   */
  getStats: async (): Promise<ApiResponse<ProductStats>> => {
    return apiGet<ProductStats>("/product/stats");
  },

  /**
   * Lấy tất cả sản phẩm (có phân trang)
   * GET /api/v1/product
   */
  getAll: async (params?: ProductQueryParams): Promise<ApiResponse<Product[]> & { pagination?: Pagination }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.categoryId && params.categoryId !== "all") {
      queryParams.append("categoryId", params.categoryId);
    }
    if (params?.status && params?.status !== "all") {
      queryParams.append("status", params.status);
    }
    
    const query = queryParams.toString();
    return apiGet<Product[]>(`/product${query ? `?${query}` : ""}`);
  },

  /**
   * Tìm kiếm sản phẩm theo tên hoặc barcode
   * GET /api/v1/product/search?name=xxx
   * BE sẽ tìm kiếm theo cả name và barcode
   */
  search: async (
    params: SearchProductParams
  ): Promise<ApiResponse<Product[]>> => {
    const queryParams = new URLSearchParams();
    if (params.name) queryParams.append("name", params.name);
    if (params.categoryId) queryParams.append("categoryId", params.categoryId);

    return apiGet<Product[]>(`/product/search?${queryParams.toString()}`);
  },

  /**
   * Lấy sản phẩm theo barcode
   * GET /api/v1/product/barcode/:barcode
   */
  getByBarcode: async (barcode: string): Promise<ApiResponse<Product>> => {
    return apiGet<Product>(`/product/barcode/${barcode}`);
  },

  /**
   * Lấy sản phẩm theo loại
   * GET /api/v1/product/category/:categoryId
   */
  getByCategory: async (
    categoryId: string
  ): Promise<ApiResponse<Product[]>> => {
    return apiGet<Product[]>(`/product/category/${categoryId}`);
  },

  /**
   * Lấy chi tiết sản phẩm
   * GET /api/v1/product/:id
   */
  getById: async (id: string): Promise<ApiResponse<Product>> => {
    return apiGet<Product>(`/product/${id}`);
  },

  /**
   * Tạo sản phẩm mới
   * POST /api/v1/product
   */
  create: async (data: CreateProductRequest): Promise<ApiResponse<Product>> => {
    return apiPost<Product>("/product", data);
  },

  /**
   * Cập nhật sản phẩm
   * PUT /api/v1/product/:id
   */
  update: async (
    id: string,
    data: UpdateProductRequest
  ): Promise<ApiResponse<Product>> => {
    return apiPut<Product>(`/product/${id}`, data);
  },

  /**
   * Cập nhật giá bán
   * PATCH /api/v1/product/:id/price
   */
  updatePrice: async (
    id: string,
    data: UpdatePriceRequest
  ): Promise<ApiResponse<Product>> => {
    return apiPatch<Product>(`/product/${id}/price`, data);
  },

  /**
   * Xóa sản phẩm
   * DELETE /api/v1/product/:id
   */
  remove: async (id: string): Promise<ApiResponse> => {
    return apiDelete(`/product/${id}`);
  },

  /**
   * Xóa nhiều sản phẩm
   * DELETE /api/v1/product/bulk
   */
  removeMany: async (ids: string[]): Promise<ApiResponse> => {
    return apiDelete("/product/bulk", {
      body: JSON.stringify({ ids }),
      headers: { "Content-Type": "application/json" },
    });
  },
};

export default productService;
