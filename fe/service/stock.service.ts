import { apiGet, apiPatch } from "./api.service";
import { ApiResponse } from "./api.config";

export interface BranchProduct {
  _id: string;
  branchId: string;
  branchName?: string;
  productId: string;
  productName?: string;
  quantity: number;
  minStock: number;
  updatedAt: string;
}

export interface StockAvailability {
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
}

const stockService = {
  /**
   * Lấy tồn kho theo chi nhánh
   * GET /api/v1/stock/branch/:branchId
   */
  getByBranch: async (
    branchId: string
  ): Promise<ApiResponse<BranchProduct[]>> => {
    return apiGet<BranchProduct[]>(`/stock/branch/${branchId}`);
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
