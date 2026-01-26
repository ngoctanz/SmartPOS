import express from "express";
import { exportController } from "../controllers/exportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Export products to Excel
router.get("/products", exportController.exportProducts);

// Download import template
router.get("/template", exportController.downloadTemplate);

// Export products by category
router.get("/products/by-category", exportController.exportByCategory);

// Export aggregated stock (admin only)
router.get("/stock/aggregated", exportController.exportAggregatedStock);

// Export stock by specific branch
router.get("/stock/branch/:branchId", exportController.exportStockByBranch);

export const exportRouter = router;
