import { apiGet, apiPost, apiPatch } from "./api.service";
import { ApiResponse } from "./api.config";

export interface ImportReceiptItem {
  productId: string;
  barcode: string;
  productName: string;
  quantity: number;
  importPrice: number;
  subtotal: number;
}

export interface ImportReceipt {
  _id: string;
  code: string;
  barcode: string;
  branchId: string | { _id: string; branchName: string };
  createdBy: string | { _id: string; userName: string; name?: string };
  listProduct: ImportReceiptItem[];
  totalAmount: number;
  status: "pending" | "completed" | "cancelled";
  supplierName?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateImportReceiptRequest {
  branchId?: string;
  listProduct: {
    productId: string;
    quantity: number;
    importPrice: number;
  }[];
  supplierName?: string;
  note?: string;
}

export interface GetImportReceiptParams {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
}

export interface DateRangeParams {
  startDate: string;
  endDate: string;
  branchId?: string;
}

export interface TotalImportData {
  totalAmount: number;
  totalReceipts: number;
}

const importReceiptService = {
  /**
   * Lấy tất cả phiếu nhập
   * GET /api/v1/import-receipt
   */
  getAll: async (
    params?: GetImportReceiptParams
  ): Promise<ApiResponse<ImportReceipt[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.status) queryParams.append("status", params.status);

    const query = queryParams.toString();
    return apiGet<ImportReceipt[]>(
      `/import-receipt${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy phiếu nhập theo khoảng thời gian
   * GET /api/v1/import-receipt/date-range
   */
  getByDateRange: async (
    params: DateRangeParams
  ): Promise<ApiResponse<ImportReceipt[]>> => {
    const queryParams = new URLSearchParams();
    queryParams.append("startDate", params.startDate);
    queryParams.append("endDate", params.endDate);
    if (params.branchId) queryParams.append("branchId", params.branchId);

    return apiGet<ImportReceipt[]>(
      `/import-receipt/date-range?${queryParams.toString()}`
    );
  },

  /**
   * Lấy tổng giá trị nhập hàng
   * GET /api/v1/import-receipt/total
   */
  getTotalImport: async (
    params?: DateRangeParams
  ): Promise<ApiResponse<TotalImportData>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<TotalImportData>(
      `/import-receipt/total${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy phiếu nhập theo mã
   * GET /api/v1/import-receipt/code/:code
   */
  getByCode: async (code: string): Promise<ApiResponse<ImportReceipt>> => {
    return apiGet<ImportReceipt>(`/import-receipt/code/${code}`);
  },

  /**
   * Lấy phiếu nhập theo barcode
   * GET /api/v1/import-receipt/barcode/:barcode
   */
  getByBarcode: async (
    barcode: string
  ): Promise<ApiResponse<ImportReceipt>> => {
    return apiGet<ImportReceipt>(`/import-receipt/barcode/${barcode}`);
  },

  /**
   * Lấy phiếu nhập theo chi nhánh
   * GET /api/v1/import-receipt/branch/:branchId
   */
  getByBranch: async (
    branchId: string
  ): Promise<ApiResponse<ImportReceipt[]>> => {
    return apiGet<ImportReceipt[]>(`/import-receipt/branch/${branchId}`);
  },

  /**
   * Lấy chi tiết phiếu nhập
   * GET /api/v1/import-receipt/:id
   */
  getById: async (id: string): Promise<ApiResponse<ImportReceipt>> => {
    return apiGet<ImportReceipt>(`/import-receipt/${id}`);
  },

  /**
   * Tạo phiếu nhập mới
   * POST /api/v1/import-receipt
   */
  create: async (
    data: CreateImportReceiptRequest
  ): Promise<ApiResponse<ImportReceipt>> => {
    return apiPost<ImportReceipt>("/import-receipt", data);
  },

  /**
   * Xác nhận phiếu nhập
   * PATCH /api/v1/import-receipt/:id/confirm
   */
  confirm: async (id: string): Promise<ApiResponse<ImportReceipt>> => {
    return apiPatch<ImportReceipt>(`/import-receipt/${id}/confirm`);
  },

  /**
   * Hủy phiếu nhập
   * PATCH /api/v1/import-receipt/:id/cancel
   */
  cancel: async (
    id: string,
    reason: string
  ): Promise<ApiResponse<ImportReceipt>> => {
    return apiPatch<ImportReceipt>(`/import-receipt/${id}/cancel`, { reason });
  },
};

export default importReceiptService;
