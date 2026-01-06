import { apiGet, apiPatch, apiPost, apiPut, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface BranchProduct {
  _id: string;
  branchId: any; // Populated object or string
  productId: any; // Populated object or string
  stock: number;
  minStock: number;
  avgImportPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockAvailability {
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StockListResponse {
  data: BranchProduct[];
  pagination: Pagination;
}

export interface StockQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  lowStockOnly?: boolean;
}

const stockService = {
  /**
   * Get all stock with pagination and search
   * GET /api/v1/stock
   */
  getAll: async (params?: StockQueryParams): Promise<ApiResponse<BranchProduct[]> & { pagination?: Pagination }> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.lowStockOnly) searchParams.append("lowStockOnly", "true");
    
    const query = searchParams.toString();
    return apiGet<BranchProduct[]>(`/stock${query ? `?${query}` : ""}`);
  },

  /**
   * Create stock report (Bulk)
   * POST /api/v1/stock
   */
  create: async (data: { branchId?: string; items: { productId: string; stock: number; minStock?: number }[] }): Promise<ApiResponse<BranchProduct>> => {
    return apiPost<BranchProduct>("/stock", data);
  },

  /**
   * Update stock
   * PUT /api/v1/stock/:id
   */
  update: async (id: string, data: { stock?: number; minStock?: number }): Promise<ApiResponse<BranchProduct>> => {
    return apiPut<BranchProduct>(`/stock/${id}`, data);
  },

  /**
   * Delete stock
   * DELETE /api/v1/stock/:id
   */
  delete: async (id: string): Promise<ApiResponse> => {
    return apiDelete(`/stock/${id}`);
  },

  /**
   * Lấy tồn kho theo chi nhánh với pagination và search
   * GET /api/v1/stock/branch/:branchId
   */
  getByBranch: async (
    branchId: string,
    params?: StockQueryParams
  ): Promise<ApiResponse<BranchProduct[]> & { pagination?: Pagination }> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.lowStockOnly) searchParams.append("lowStockOnly", "true");
    
    const query = searchParams.toString();
    return apiGet<BranchProduct[]>(`/stock/branch/${branchId}${query ? `?${query}` : ""}`);
  },

  /**
   * Lấy tồn kho theo sản phẩm
   * GET /api/v1/stock/product/:productId
   */
  getByProduct: async (
    productId: string
  ): Promise<ApiResponse<BranchProduct[]>> => {
    return apiGet<BranchProduct[]>(`/stock/product/${productId}`);
  },

  /**
   * Lấy tồn kho cụ thể
   * GET /api/v1/stock/branch/:branchId/product/:productId
   */
  getStock: async (
    branchId: string,
    productId: string
  ): Promise<ApiResponse<BranchProduct>> => {
    return apiGet<BranchProduct>(
      `/stock/branch/${branchId}/product/${productId}`
    );
  },

  /**
   * Lấy danh sách sản phẩm sắp hết hàng
   * GET /api/v1/stock/branch/:branchId/low-stock
   */
  getLowStock: async (
    branchId: string
  ): Promise<ApiResponse<BranchProduct[]>> => {
    return apiGet<BranchProduct[]>(`/stock/branch/${branchId}/low-stock`);
  },

  /**
   * Kiểm tra tồn kho
   * GET /api/v1/stock/branch/:branchId/product/:productId/check
   */
  checkAvailability: async (
    branchId: string,
    productId: string,
    quantity: number
  ): Promise<ApiResponse<StockAvailability>> => {
    return apiGet<StockAvailability>(
      `/stock/branch/${branchId}/product/${productId}/check?quantity=${quantity}`
    );
  },

  /**
   * Cập nhật mức tồn kho tối thiểu
   * PATCH /api/v1/stock/branch/:branchId/product/:productId/min-stock
   */
  setMinStock: async (
    branchId: string,
    productId: string,
    minStock: number
  ): Promise<ApiResponse<BranchProduct>> => {
    return apiPatch<BranchProduct>(
      `/stock/branch/${branchId}/product/${productId}/min-stock`,
      { minStock }
    );
  },
};

export default stockService;
