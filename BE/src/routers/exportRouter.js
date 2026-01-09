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

export const exportRouter = router;
