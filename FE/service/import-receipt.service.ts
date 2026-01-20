import { apiGet, apiPost, apiPatch, apiDelete } from "./api.service";
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
  isError?: boolean;
  errorNote?: string;
  errorMarkedAt?: string;
  errorMarkedBy?: string | { _id: string; userName: string; name?: string };
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
  search?: string;
  period?: "today" | "week" | "month" | "3month" | "6month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export interface ImportReceiptStats {
  totalReceipts: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalValue: number;
}

export interface ErrorReceiptStats {
  totalErrorReceipts: number;
  totalErrorValue: number;
}

const importReceiptService = {
  /**
   * Get stats for import receipts
   * GET /api/v1/import-receipt/stats
   */
  getStats: async (branchId?: string, period?: string, startDate?: string, endDate?: string): Promise<ApiResponse<ImportReceiptStats>> => {
    const queryParams = new URLSearchParams();
    if (branchId) queryParams.append("branchId", branchId);
    if (period && period !== "custom") queryParams.append("period", period);
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    return apiGet<ImportReceiptStats>(`/import-receipt/stats?${queryParams.toString()}`);
  },

  /**
   * Lấy tất cả phiếu nhập (có phân trang)
   * GET /api/v1/import-receipt
   */
  getAll: async (
    params?: GetImportReceiptParams
  ): Promise<ApiResponse<ImportReceipt[]> & { pagination?: Pagination }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.period && params.period !== "custom") queryParams.append("period", params.period);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const query = queryParams.toString();
    return apiGet<ImportReceipt[]>(
      `/import-receipt${query ? `?${query}` : ""}`
    );
  },

  /**
   * Alias for getAll (for compatibility)
   */
  getAllPaginated: async (
    params?: GetImportReceiptParams
  ): Promise<ApiResponse<ImportReceipt[]> & { pagination?: Pagination }> => {
    return importReceiptService.getAll(params);
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

  /**
   * Đánh dấu phiếu lỗi
   * PATCH /api/v1/import-receipt/:id/mark-error
   */
  markAsError: async (
    id: string,
    errorNote: string
  ): Promise<ApiResponse<ImportReceipt>> => {
    return apiPatch<ImportReceipt>(`/import-receipt/${id}/mark-error`, { errorNote });
  },

  /**
   * Lấy danh sách phiếu lỗi
   * GET /api/v1/import-receipt/errors
   */
  getErrorReceipts: async (
    params?: GetImportReceiptParams
  ): Promise<ApiResponse<ImportReceipt[]> & { pagination?: Pagination }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString();
    return apiGet<ImportReceipt[]>(
      `/import-receipt/errors${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy stats phiếu lỗi
   * GET /api/v1/import-receipt/errors/stats
   */
  getErrorStats: async (branchId?: string): Promise<ApiResponse<ErrorReceiptStats>> => {
    const queryParams = new URLSearchParams();
    if (branchId) queryParams.append("branchId", branchId);
    return apiGet<ErrorReceiptStats>(`/import-receipt/errors/stats?${queryParams.toString()}`);
  },

  /**
   * Xóa phiếu lỗi (chỉ admin)
   * DELETE /api/v1/import-receipt/errors/:id
   */
  deleteErrorReceipt: async (id: string): Promise<ApiResponse<void>> => {
    return apiDelete<void>(`/import-receipt/errors/${id}`);
  },

  /**
   * Import phiếu nhập từ Excel
   * POST /api/v1/import/receipt
   */
  importExcel: async (
    file: File,
    branchId?: string
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (branchId) {
      formData.append("branchId", branchId);
    }
    return apiPost<any>("/import/receipt", formData);
  },
};

export default importReceiptService;
