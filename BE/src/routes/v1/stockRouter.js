import express from "express";
import { branchProductController } from "../../controllers/branchProductController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch, checkBranchAccess } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);
Router.use(injectUserBranch()); 

// Get stock info - cần check branch access cho routes có :branchId
Router.get("/branch/:branchId", checkBranchAccess, branchProductController.getByBranch);
Router.get("/branch/:branchId/barcode/:barcode", checkBranchAccess, branchProductController.getByBarcode);
// Get stock info
Router.get("/stats", authorize("admin", "manager", "staff"), branchProductController.getStats);
// Get aggregated stock by product (admin only - for "All branches" view)
Router.get("/aggregated", authorize("admin"), branchProductController.getAggregatedByProduct);
Router.get("/product/:productId", branchProductController.getByProduct);
Router.get("/branch/:branchId/product/:productId", checkBranchAccess, branchProductController.getStock);
Router.get("/branch/:branchId/low-stock", checkBranchAccess, branchProductController.getLowStock);
Router.get(
  "/branch/:branchId/product/:productId/check",
  checkBranchAccess,
  branchProductController.checkAvailability
);

// Admin only - Update min stock
Router.patch(
  "/branch/:branchId/product/:productId/min-stock",
  authorize("admin"),
  branchProductController.setMinStock
);

// Get all stock
Router.get("/", authorize("admin", "manager", "staff"), branchProductController.getAll);

// Create stock report (Staff & Manager)
Router.post("/", authorize("manager", "staff"), branchProductController.create);

// Update stock (Staff & Manager)
Router.put("/:id", authorize("manager", "staff"), branchProductController.update);

// Update note (Admin, Manager & Staff) - chỉ cập nhật ghi chú
Router.patch("/:id/note", authorize("admin", "manager", "staff"), branchProductController.updateNote);

// Update sale price (Admin, Manager & Staff) - cập nhật giá bán theo chi nhánh
Router.patch("/:id/sale-price", authorize("admin", "manager", "staff"), branchProductController.updateSalePrice);

// Update min stock (Admin, Manager & Staff) - cập nhật định mức tối thiểu
Router.patch("/:id/min-stock", authorize("admin", "manager", "staff"), branchProductController.updateMinStock);

// Delete stock (Admin)
Router.delete("/:id", authorize("admin"), branchProductController.remove);

export const stockRouter = Router;
