import { apiGet, apiPost, apiPatch } from "./api.service";
import { ApiResponse } from "./api.config";

export interface ReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
}

export interface PaymentInfo {
  orderCode: number;
  linkId: string;
  qrCode: string;
  checkoutUrl: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  amount: number;
  description: string;
  status: "pending" | "paid" | "cancelled" | "expired" | "";
}

export interface Receipt {
  _id: string;
  code: string;
  branchId: string | { _id: string; branchName: string; address?: string };
  createdBy: string | { _id: string; userName: string; name?: string };
  listProduct: ReceiptItem[];
  totalAmount: number;
  customerPaid?: number | null; // Tiền khách đưa
  paymentMethod: "cash" | "card" | "transfer";
  status: "completed" | "cancelled" | "pending";
  // Error receipt fields
  isError: boolean;
  markedErrorBy?: string | { _id: string; userName: string; name?: string };
  markedErrorAt?: string;
  errorReason?: string;
  // PayOS payment info (only for transfer)
  paymentInfo?: PaymentInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceiptRequest {
  branchId?: string; // Optional: Staff không cần gửi (backend inject), Admin bắt buộc
  listProduct: {
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
  }[];
  totalAmount: number;
  paymentMethod: "cash" | "card" | "transfer";
  customerPaid?: number; // Tiền khách đưa (chỉ dùng cho cash)
}

export interface QRPreviewRequest {
  branchId?: string;
  listProduct: {
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
  }[];
}

export interface QRPreviewResponse {
  orderCode: number;
  receiptCode: string;
  receiptId: string;
  totalAmount: number;
  paymentInfo: PaymentInfo;
  expiresAt: string;
}

export interface GetReceiptParams {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
  paymentMethod?: string;
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

export interface RevenueData {
  totalRevenue: number;
  totalReceipts: number;
  averageReceiptValue: number;
}

export interface DailyRevenueData {
  date: string;
  revenue: number;
  receipts: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ReceiptStats {
  totalReceipts: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

export interface ErrorStats {
  totalErrorReceipts: number;
  totalErrorAmount: number;
  errorsByBranch: {
    branchId: string;
    branchName: string;
    count: number;
    totalAmount: number;
  }[];
  recentErrors: {
    code: string;
    totalAmount: number;
    markedErrorAt: string;
  }[];
}

const receiptService = {
  /**
   * Get stats for receipts
   * GET /api/v1/receipt/stats
   */
  getStats: async (branchId?: string, period?: string, startDate?: string, endDate?: string): Promise<ApiResponse<ReceiptStats>> => {
    const queryParams = new URLSearchParams();
    if (branchId) queryParams.append("branchId", branchId);
    if (period && period !== "custom") queryParams.append("period", period);
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    return apiGet<ReceiptStats>(`/receipt/stats?${queryParams.toString()}`);
  },

  /**
   * Lấy tất cả hóa đơn (có phân trang)
   * GET /api/v1/receipt
   */
  getAll: async (
    params?: GetReceiptParams
  ): Promise<ApiResponse<Receipt[]> & { pagination?: Pagination }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.paymentMethod)
      queryParams.append("paymentMethod", params.paymentMethod);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.period && params.period !== "custom") queryParams.append("period", params.period);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const query = queryParams.toString();
    return apiGet<Receipt[]>(`/receipt${query ? `?${query}` : ""}`);
  },

  /**
   * Lấy hóa đơn theo khoảng thời gian
   * GET /api/v1/receipt/date-range
   */
  getByDateRange: async (
    params: DateRangeParams
  ): Promise<ApiResponse<Receipt[]>> => {
    const queryParams = new URLSearchParams();
    queryParams.append("startDate", params.startDate);
    queryParams.append("endDate", params.endDate);
    if (params.branchId) queryParams.append("branchId", params.branchId);

    return apiGet<Receipt[]>(`/receipt/date-range?${queryParams.toString()}`);
  },

  /**
   * Lấy doanh thu
   * GET /api/v1/receipt/revenue
   */
  getRevenue: async (
    params?: DateRangeParams
  ): Promise<ApiResponse<RevenueData>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<RevenueData>(`/receipt/revenue${query ? `?${query}` : ""}`);
  },

  /**
   * Lấy doanh thu theo ngày
   * GET /api/v1/receipt/daily-revenue
   */
  getDailyRevenue: async (
    params: DateRangeParams
  ): Promise<ApiResponse<DailyRevenueData[]>> => {
    const queryParams = new URLSearchParams();
    queryParams.append("startDate", params.startDate);
    queryParams.append("endDate", params.endDate);
    if (params.branchId) queryParams.append("branchId", params.branchId);

    return apiGet<DailyRevenueData[]>(
      `/receipt/daily-revenue?${queryParams.toString()}`
    );
  },

  /**
   * Lấy sản phẩm bán chạy
   * GET /api/v1/receipt/top-products
   */
  getTopProducts: async (
    params?: DateRangeParams & { limit?: number }
  ): Promise<ApiResponse<TopProduct[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.limit) queryParams.append("limit", String(params.limit));

    const query = queryParams.toString();
    return apiGet<TopProduct[]>(
      `/receipt/top-products${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy hóa đơn theo mã
   * GET /api/v1/receipt/code/:code
   */
  getByCode: async (code: string): Promise<ApiResponse<Receipt>> => {
    return apiGet<Receipt>(`/receipt/code/${code}`);
  },

  /**
   * Lấy hóa đơn theo chi nhánh
   * GET /api/v1/receipt/branch/:branchId
   */
  getByBranch: async (branchId: string): Promise<ApiResponse<Receipt[]>> => {
    return apiGet<Receipt[]>(`/receipt/branch/${branchId}`);
  },

  /**
   * Lấy chi tiết hóa đơn
   * GET /api/v1/receipt/:id
   */
  getById: async (id: string): Promise<ApiResponse<Receipt>> => {
    return apiGet<Receipt>(`/receipt/${id}`);
  },

  /**
   * Tạo hóa đơn mới
   * POST /api/v1/receipt
   */
  create: async (data: CreateReceiptRequest): Promise<ApiResponse<Receipt>> => {
    return apiPost<Receipt>("/receipt", data);
  },

  /**
   * Tạo QR preview cho thanh toán chuyển khoản (chưa tạo hóa đơn)
   * POST /api/v1/receipt/preview-qr
   */
  createQRPreview: async (data: QRPreviewRequest): Promise<ApiResponse<QRPreviewResponse>> => {
    return apiPost<QRPreviewResponse>("/receipt/preview-qr", data);
  },

  /**
   * Hủy QR preview
   * POST /api/v1/receipt/cancel-preview
   */
  cancelQRPreview: async (orderCode: number): Promise<ApiResponse<void>> => {
    return apiPost<void>("/receipt/cancel-preview", { orderCode });
  },

  /**
   * Lấy thông tin QR preview
   * GET /api/v1/receipt/preview-qr/:orderCode
   */
  getQRPreview: async (orderCode: number): Promise<ApiResponse<QRPreviewResponse>> => {
    return apiGet<QRPreviewResponse>(`/receipt/preview-qr/${orderCode}`);
  },

  /**
   * Cập nhật QR preview với giỏ hàng mới
   * PUT /api/v1/receipt/preview-qr/:orderCode
   */
  updateQRPreview: async (
    orderCode: number,
    data: QRPreviewRequest
  ): Promise<ApiResponse<QRPreviewResponse>> => {
    const { apiPut } = await import("./api.service");
    return apiPut<QRPreviewResponse>(`/receipt/preview-qr/${orderCode}`, data);
  },

  /**
   * Xác nhận QR preview - chuyển draft thành pending
   * POST /api/v1/receipt/confirm-preview
   */
  confirmQRPreview: async (orderCode: number): Promise<ApiResponse<Receipt>> => {
    return apiPost<Receipt>("/receipt/confirm-preview", { orderCode });
  },

  /**
   * Hủy hóa đơn
   * PATCH /api/v1/receipt/:id/cancel
   */
  cancel: async (id: string, reason: string): Promise<ApiResponse<Receipt>> => {
    return apiPatch<Receipt>(`/receipt/${id}/cancel`, { reason });
  },

  /**
   * Cập nhật hóa đơn
   * PATCH /api/v1/receipt/:id
   */
  update: async (
    id: string,
    data: {
      listProduct: {
        productId: string;
        productName: string;
        quantity: number;
        salePrice: number;
      }[];
      totalAmount: number;
    }
  ): Promise<ApiResponse<Receipt>> => {
    return apiPatch<Receipt>(`/receipt/${id}`, data);
  },

  /**
   * Kiểm tra trạng thái thanh toán
   * GET /api/v1/receipt/payment-status/:orderCode
   */
  checkPaymentStatus: async (
    orderCode: number
  ): Promise<ApiResponse<{ paymentStatus: string; receipt: Receipt }>> => {
    return apiGet<{ paymentStatus: string; receipt: Receipt }>(
      `/receipt/payment-status/${orderCode}`
    );
  },

  /**
   * Đánh dấu hóa đơn lỗi
   * PATCH /api/v1/receipt/:id/mark-error
   */
  markAsError: async (
    id: string,
    errorReason?: string
  ): Promise<ApiResponse<Receipt>> => {
    return apiPatch<Receipt>(`/receipt/${id}/mark-error`, { errorReason });
  },

  /**
   * Lấy danh sách hóa đơn lỗi
   * GET /api/v1/receipt/errors
   */
  getErrors: async (
    params?: GetReceiptParams & { sortBy?: string; sortOrder?: string }
  ): Promise<ApiResponse<Receipt[]> & { pagination?: Pagination }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const query = queryParams.toString();
    return apiGet<Receipt[]>(`/receipt/errors${query ? `?${query}` : ""}`);
  },

  /**
   * Lấy thống kê hóa đơn lỗi
   * GET /api/v1/receipt/errors/stats
   */
  getErrorStats: async (branchId?: string): Promise<ApiResponse<ErrorStats>> => {
    const queryParams = new URLSearchParams();
    if (branchId) queryParams.append("branchId", branchId);
    return apiGet<ErrorStats>(
      `/receipt/errors/stats${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    );
  },

  /**
   * Xóa hóa đơn lỗi (Admin/Manager only)
   * DELETE /api/v1/receipt/errors/:id
   */
  deleteErrorReceipt: async (id: string): Promise<ApiResponse<void>> => {
    const { apiDelete } = await import("./api.service");
    return apiDelete<void>(`/receipt/errors/${id}`);
  },
};

export default receiptService;
