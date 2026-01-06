import express from "express";
import { branchProductController } from "../../controllers/branchProductController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);
Router.use(injectUserBranch); 

// Get stock info
Router.get("/branch/:branchId", branchProductController.getByBranch);
Router.get("/product/:productId", branchProductController.getByProduct);
Router.get("/branch/:branchId/product/:productId", branchProductController.getStock);
Router.get("/branch/:branchId/low-stock", branchProductController.getLowStock);
Router.get(
  "/branch/:branchId/product/:productId/check",
  branchProductController.checkAvailability
);

// Admin only - Update min stock
Router.patch(
  "/branch/:branchId/product/:productId/min-stock",
  authorize("admin"),
  branchProductController.setMinStock
);

// Get all stock
Router.get("/", authorize("admin", "staff"), branchProductController.getAll);

// Create stock report (Staff)
Router.post("/", authorize("staff"), branchProductController.create);

// Update stock (Staff)
Router.put("/:id", authorize("staff"), branchProductController.update);

// Delete stock (Admin)
Router.delete("/:id", authorize("admin"), branchProductController.remove);

export const stockRouter = Router;
