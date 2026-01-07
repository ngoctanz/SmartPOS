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
  status: "pending" | "paid" | "cancelled" | "expired" | "";
}

export interface Receipt {
  _id: string;
  code: string;
  branchId: string | { _id: string; branchName: string; address?: string };
  createdBy: string | { _id: string; userName: string; name?: string };
  listProduct: ReceiptItem[];
  totalAmount: number;
  paymentMethod: "cash" | "card" | "transfer";
  status: "completed" | "cancelled" | "pending";
  // PayOS payment info (only for transfer)
  paymentInfo?: PaymentInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceiptRequest {
  branchId: string;
  listProduct: {
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
  }[];
  totalAmount: number;
  paymentMethod: "cash" | "card" | "transfer";
}

export interface GetReceiptParams {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
  paymentMethod?: string;
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

const receiptService = {
  /**
    * Get stats for receipts
    * GET /api/v1/receipt/stats
    */
   getStats: async (branchId?: string): Promise<ApiResponse<ReceiptStats>> => {
       const queryParams = new URLSearchParams();
       if (branchId) queryParams.append("branchId", branchId);
       return apiGet<ReceiptStats>(`/receipt/stats?${queryParams.toString()}`);
   },

  /**
   * Lấy tất cả hóa đơn
   * GET /api/v1/receipt
   */
  getAll: async (
    params?: GetReceiptParams
  ): Promise<ApiResponse<Receipt[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.paymentMethod)
      queryParams.append("paymentMethod", params.paymentMethod);

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
};

export default receiptService;
