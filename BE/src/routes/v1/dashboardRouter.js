import express from "express";
import { dashboardController } from "../../controllers/dashboardController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);
Router.use(injectUserBranch); // Tự động inject branchId cho staff

// Dashboard routes - Admin only
Router.get(
  "/",
  authorize("admin"),
  dashboardController.getFullDashboard
);

Router.get(
  "/summary",
  authorize("admin"),
  dashboardController.getSummary
);

Router.get(
  "/daily-stats",
  authorize("admin"),
  dashboardController.getDailyStats
);

Router.get(
  "/top-products",
  authorize("admin"),
  dashboardController.getTopProducts
);

Router.get(
  "/payment-stats",
  authorize("admin"),
  dashboardController.getPaymentStats
);

Router.get(
  "/low-stock/:branchId",
  authorize("admin"),
  dashboardController.getLowStockAlert
);

export const dashboardRouter = Router;
