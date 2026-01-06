import { apiGet } from "./api.service";
import { ApiResponse } from "./api.config";

export interface DashboardSummary {
  totalRevenue: number;
  totalReceipts: number;
  totalProducts: number;
  totalBranches: number;
  revenueGrowth?: number;
  receiptsGrowth?: number;
}

export interface DailyStats {
  date: string;
  revenue: number;
  receipts: number;
  profit?: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface PaymentStats {
  cash: number;
  card: number;
  transfer: number;
  totalAmount: number;
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
}

export interface FullDashboard {
  summary: DashboardSummary;
  dailyStats: DailyStats[];
  topProducts: TopProduct[];
  paymentStats: PaymentStats;
  lowStockAlerts: LowStockProduct[];
}

export interface DashboardParams {
  startDate?: string;
  endDate?: string;
  branchId?: string;
}

const dashboardService = {
  /**
   * Lấy toàn bộ dashboard
   * GET /api/v1/dashboard
   */
  getFullDashboard: async (
    params?: DashboardParams
  ): Promise<ApiResponse<FullDashboard>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<FullDashboard>(`/dashboard${query ? `?${query}` : ""}`);
  },

  /**
   * Lấy tổng quan
   * GET /api/v1/dashboard/summary
   */
  getSummary: async (
    params?: DashboardParams
  ): Promise<ApiResponse<DashboardSummary>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<DashboardSummary>(
      `/dashboard/summary${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy thống kê theo ngày
   * GET /api/v1/dashboard/daily-stats
   */
  getDailyStats: async (
    params?: DashboardParams
  ): Promise<ApiResponse<DailyStats[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<DailyStats[]>(
      `/dashboard/daily-stats${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy sản phẩm bán chạy
   * GET /api/v1/dashboard/top-products
   */
  getTopProducts: async (
    params?: DashboardParams & { limit?: number }
  ): Promise<ApiResponse<TopProduct[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.limit) queryParams.append("limit", String(params.limit));

    const query = queryParams.toString();
    return apiGet<TopProduct[]>(
      `/dashboard/top-products${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy thống kê phương thức thanh toán
   * GET /api/v1/dashboard/payment-stats
   */
  getPaymentStats: async (
    params?: DashboardParams
  ): Promise<ApiResponse<PaymentStats>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<PaymentStats>(
      `/dashboard/payment-stats${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy cảnh báo sắp hết hàng
   * GET /api/v1/dashboard/low-stock/:branchId
   */
  getLowStockAlert: async (
    branchId: string
  ): Promise<ApiResponse<LowStockProduct[]>> => {
    return apiGet<LowStockProduct[]>(`/dashboard/low-stock/${branchId}`);
  },
};

export default dashboardService;
