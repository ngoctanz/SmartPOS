import express from "express";
import { receiptController } from "../../controllers/receiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);
Router.use(injectUserBranch); // Tự động inject branchId cho staff

// Get routes
Router.get("/", receiptController.getAll);
Router.get("/date-range", receiptController.getByDateRange);
Router.get("/revenue", receiptController.getRevenue);
Router.get("/daily-revenue", receiptController.getDailyRevenue);
Router.get("/top-products", receiptController.getTopProducts);
Router.get("/code/:code", receiptController.getByCode);
Router.get("/branch/:branchId", receiptController.getByBranch);
Router.get("/:id", receiptController.getById);

// Create receipt (all authenticated staff can sell)
Router.post(
  "/",
  receiptValidation.createReceipt,
  receiptController.create
);

// Cancel receipt - Admin only
Router.patch(
  "/:id/cancel",
  authorize("admin"),
  receiptController.cancel
);

export const receiptRouter = Router;
