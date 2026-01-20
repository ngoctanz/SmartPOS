// Export all services
export { default as authService } from "./auth.service";
export { default as userService } from "./user.service";
export { default as branchService } from "./branch.service";
export { default as categoryService } from "./category.service";
export { default as productService } from "./product.service";
export { default as receiptService } from "./receipt.service";
export { default as importReceiptService } from "./import-receipt.service";
export { default as stockService } from "./stock.service";
export { default as dashboardService } from "./dashboard.service";

// Export API utilities
export { setAccessToken, getAccessToken } from "./api.service";
export { API_CONFIG } from "./api.config";

// Export types from auth
export type {
  LoginRequest,
  User as AuthUser,
  LoginResponse,
} from "./auth.service";

// Export types from user
export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  SearchUserParams,
} from "./user.service";

// Export types from branch
export type {
  Branch,
  CreateBranchRequest,
  UpdateBranchRequest,
  SearchBranchParams,
} from "./branch.service";

// Export types from category
export type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  SearchCategoryParams,
} from "./category.service";

// Export types from product
export type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  UpdatePriceRequest,
  SearchProductParams,
} from "./product.service";

// Export types from receipt
export type {
  Receipt,
  ReceiptItem,
  CreateReceiptRequest,
  GetReceiptParams,
  DateRangeParams,
  RevenueData,
  DailyRevenueData,
  TopProduct,
} from "./receipt.service";

// Export types from import-receipt
export type {
  ImportReceipt,
  ImportReceiptItem,
  CreateImportReceiptRequest,
  GetImportReceiptParams,
  TotalImportData,
  ImportReceiptStats,
  ErrorReceiptStats,
  Pagination,
} from "./import-receipt.service";

// Export types from stock
export type { BranchProduct, StockAvailability } from "./stock.service";

// Export types from dashboard
export type {
  DashboardSummary,
  DailyStats,
  TopProduct as DashboardTopProduct,
  PaymentMethodStats,
  LowStockProduct,
  BranchRevenue,
  CategorySales,
  FullDashboard,
  DashboardParams,
} from "./dashboard.service";

// Export API response types
export type { ApiResponse, ApiError } from "./api.config";
export { FetchError } from "./api.service";
