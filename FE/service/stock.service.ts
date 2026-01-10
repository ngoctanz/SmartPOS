import { apiGet, apiPatch, apiPost, apiPut, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface BranchProduct {
  _id: string;
  branchId: any; // Populated object or string
  productId: any; // Populated object or string
  stock: number;
  minStock: number;
  salePrice: number; // Giá bán theo chi nhánh
  avgImportPrice?: number;
  note?: string | null; // Ghi chú cho sản phẩm
  branchCount?: number; // Only for aggregated view
  isAggregated?: boolean; // Flag for aggregated data
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

export interface BranchProductStats {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
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
   * Get aggregated stock by product (sum across all branches)
   * Only for admin when viewing "All branches"
   * GET /api/v1/stock/aggregated
   */
  getAggregatedByProduct: async (params?: StockQueryParams): Promise<ApiResponse<BranchProduct[]> & { pagination?: Pagination }> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.lowStockOnly) searchParams.append("lowStockOnly", "true");
    
    const query = searchParams.toString();
    return apiGet<BranchProduct[]>(`/stock/aggregated${query ? `?${query}` : ""}`);
  },

  /**
   * Get stock stats
   * GET /api/v1/stock/stats?branchId=xxx
   */
  getStats: async (branchId?: string): Promise<ApiResponse<BranchProductStats>> => {
      const queryParams = new URLSearchParams();
      if (branchId) queryParams.append("branchId", branchId);
      return apiGet<BranchProductStats>(`/stock/stats?${queryParams.toString()}`);
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
   * Lấy thông tin sản phẩm theo chi nhánh (stock, salePrice, minStock)
   * GET /api/v1/stock/branch/:branchId/product/:productId
   */
  getProductInfo: async (
    branchId: string,
    productId: string
  ): Promise<ApiResponse<{ branchId: string; productId: string; stock: number; salePrice: number; minStock: number }>> => {
    return apiGet<{ branchId: string; productId: string; stock: number; salePrice: number; minStock: number }>(
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
   * Tìm sản phẩm trong kho theo barcode
   * GET /api/v1/stock/branch/:branchId/barcode/:barcode
   */
  getByBarcode: async (
    branchId: string,
    barcode: string
  ): Promise<ApiResponse<BranchProduct>> => {
    return apiGet<BranchProduct>(`/stock/branch/${branchId}/barcode/${barcode}`);
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

  /**
   * Cập nhật ghi chú cho sản phẩm trong kho
   * PATCH /api/v1/stock/:id/note
   */
  updateNote: async (
    id: string,
    note: string,
    branchId?: string
  ): Promise<ApiResponse<BranchProduct>> => {
    return apiPatch<BranchProduct>(`/stock/${id}/note`, { note, branchId });
  },

  /**
   * Cập nhật giá bán cho sản phẩm theo chi nhánh
   * PATCH /api/v1/stock/:id/sale-price
   */
  updateSalePrice: async (
    id: string,
    salePrice: number,
    branchId?: string
  ): Promise<ApiResponse<BranchProduct>> => {
    return apiPatch<BranchProduct>(`/stock/${id}/sale-price`, { salePrice, branchId });
  },

  /**
   * Cập nhật định mức tối thiểu cho sản phẩm theo chi nhánh
   * PATCH /api/v1/stock/:id/min-stock
   */
  updateMinStock: async (
    id: string,
    minStock: number,
    branchId?: string
  ): Promise<ApiResponse<BranchProduct>> => {
    return apiPatch<BranchProduct>(`/stock/${id}/min-stock`, { minStock, branchId });
  },

  /**
   * Cập nhật thông tin sản phẩm trong kho (giá bán, định mức tối thiểu, ghi chú)
   * Gọi nhiều API để cập nhật
   */
  updateBranchProduct: async (
    id: string,
    data: { salePrice?: number; minStock?: number; note?: string },
    branchId?: string
  ): Promise<ApiResponse<BranchProduct>> => {
    const promises: Promise<ApiResponse<BranchProduct>>[] = [];
    
    if (data.salePrice !== undefined) {
      promises.push(apiPatch<BranchProduct>(`/stock/${id}/sale-price`, { salePrice: data.salePrice, branchId }));
    }
    if (data.note !== undefined) {
      promises.push(apiPatch<BranchProduct>(`/stock/${id}/note`, { note: data.note, branchId }));
    }
    
    if (promises.length === 0) {
      return { success: true, message: "No changes" } as ApiResponse<BranchProduct>;
    }
    
    const results = await Promise.all(promises);
    return results[results.length - 1]; // Return last result
  },
};

export default stockService;
