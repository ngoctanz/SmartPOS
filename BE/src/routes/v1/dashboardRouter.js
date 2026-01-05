import express from "express";
import { dashboardController } from "../../controllers/dashboardController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);

// Dashboard routes - Admin/Manager only
Router.get(
  "/",
  authorize("admin", "manager"),
  dashboardController.getFullDashboard
);

Router.get(
  "/summary",
  authorize("admin", "manager"),
  dashboardController.getSummary
);

Router.get(
  "/daily-stats",
  authorize("admin", "manager"),
  dashboardController.getDailyStats
);

Router.get(
  "/top-products",
  authorize("admin", "manager"),
  dashboardController.getTopProducts
);

Router.get(
  "/payment-stats",
  authorize("admin", "manager"),
  dashboardController.getPaymentStats
);

Router.get(
  "/low-stock/:branchId",
  authorize("admin", "manager"),
  dashboardController.getLowStockAlert
);

export const dashboardRouter = Router;
