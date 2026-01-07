import express from "express";
import { dashboardController } from "../../controllers/dashboardController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch, checkBranchAccess } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);
Router.use(injectUserBranch()); // Tự động inject branchId cho staff

// Dashboard routes - Admin & Staff có thể xem (staff chỉ xem chi nhánh của mình)
Router.get(
  "/summary",
  authorize("admin", "staff"),
  dashboardController.getSummary
);

Router.get(
  "/daily-stats",
  authorize("admin", "staff"),
  dashboardController.getDailyStats
);

Router.get(
  "/top-products",
  authorize("admin", "staff"),
  dashboardController.getTopProducts
);

Router.get(
  "/least-selling-products",
  authorize("admin", "staff"),
  dashboardController.getLeastSellingProducts
);

Router.get(
  "/sales-by-category",
  authorize("admin", "staff"),
  dashboardController.getSalesByCategory
);

Router.get(
  "/payment-stats",
  authorize("admin", "staff"),
  dashboardController.getPaymentStats
);

Router.get(
  "/low-stock/:branchId",
  authorize("admin", "staff"),
  checkBranchAccess, // Staff chỉ xem được chi nhánh của mình
  dashboardController.getLowStockAlert
);

// Dashboard routes - Admin only (so sánh giữa các chi nhánh)
Router.get(
  "/",
  authorize("admin"),
  dashboardController.getFullDashboard
);

Router.get(
  "/revenue-by-branch",
  authorize("admin"),
  dashboardController.getRevenueByBranch
);

export const dashboardRouter = Router;
