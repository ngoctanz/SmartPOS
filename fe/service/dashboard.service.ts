import { apiGet } from "./api.service";
import { ApiResponse } from "./api.config";

export interface DashboardSummary {
  period: string;
  startDate: string;
  endDate: string;
  revenue: number;
  totalImportCost: number;
  totalOrders: number;
  totalImportReceipts: number;
  totalProducts: number;
}

export interface DailyStats {
  _id: string; // date string YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface TopProduct {
  _id: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface PaymentMethodStats {
  _id: string; // 'cash' | 'card' | 'transfer'
  totalAmount: number;
  count: number;
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
}

export interface BranchRevenue {
  _id: string;
  branchName: string;
  totalRevenue: number;
  totalOrders: number;
}

export interface CategorySales {
  _id: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface FullDashboard {
  summary: DashboardSummary;
  dailyStats: DailyStats[];
  topProducts: TopProduct[];
  leastSellingProducts: TopProduct[];
  paymentStats: PaymentMethodStats[];
  revenueByBranch: BranchRevenue[];
  salesByCategory: CategorySales[];
  lowStockAlert: LowStockProduct[];
}

export interface DashboardParams {
  period?: "today" | "week" | "month" | "3month" | "6month" | "year";
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
    if (params?.period) queryParams.append("period", params.period);
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
    if (params?.period) queryParams.append("period", params.period);
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
    if (params?.period) queryParams.append("period", params.period);
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
    if (params?.period) queryParams.append("period", params.period);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.limit) queryParams.append("limit", String(params.limit));

    const query = queryParams.toString();
    return apiGet<TopProduct[]>(
      `/dashboard/top-products${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy sản phẩm bán ít nhất
   * GET /api/v1/dashboard/least-selling-products
   */
  getLeastSellingProducts: async (
    params?: DashboardParams & { limit?: number }
  ): Promise<ApiResponse<TopProduct[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append("period", params.period);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.limit) queryParams.append("limit", String(params.limit));

    const query = queryParams.toString();
    return apiGet<TopProduct[]>(
      `/dashboard/least-selling-products${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy doanh thu theo chi nhánh
   * GET /api/v1/dashboard/revenue-by-branch
   */
  getRevenueByBranch: async (
    params?: DashboardParams
  ): Promise<ApiResponse<BranchRevenue[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append("period", params.period);

    const query = queryParams.toString();
    return apiGet<BranchRevenue[]>(
      `/dashboard/revenue-by-branch${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy doanh số theo danh mục
   * GET /api/v1/dashboard/sales-by-category
   */
  getSalesByCategory: async (
    params?: DashboardParams
  ): Promise<ApiResponse<CategorySales[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append("period", params.period);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<CategorySales[]>(
      `/dashboard/sales-by-category${query ? `?${query}` : ""}`
    );
  },

  /**
   * Lấy thống kê phương thức thanh toán
   * GET /api/v1/dashboard/payment-stats
   */
  getPaymentStats: async (
    params?: DashboardParams
  ): Promise<ApiResponse<PaymentMethodStats[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append("period", params.period);
    if (params?.branchId) queryParams.append("branchId", params.branchId);

    const query = queryParams.toString();
    return apiGet<PaymentMethodStats[]>(
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
