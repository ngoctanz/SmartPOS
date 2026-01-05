import express from "express";
import { branchProductController } from "../../controllers/branchProductController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);

// Get stock info
Router.get("/branch/:branchId", branchProductController.getByBranch);
Router.get("/product/:productId", branchProductController.getByProduct);
Router.get("/branch/:branchId/product/:productId", branchProductController.getStock);
Router.get("/branch/:branchId/low-stock", branchProductController.getLowStock);
Router.get(
  "/branch/:branchId/product/:productId/check",
  branchProductController.checkAvailability
);

// Admin/Manager only - Update min stock
Router.patch(
  "/branch/:branchId/product/:productId/min-stock",
  authorize("admin", "manager"),
  branchProductController.setMinStock
);

export const stockRouter = Router;
