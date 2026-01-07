import express from "express";
import { receiptController } from "../../controllers/receiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch, validateRecordBranchAccess, checkBranchAccess } from "../../middlewares/branchMiddleware.js";
import { receiptService } from "../../services/receiptService.js";

const Router = express.Router();

// PayOS Webhook - No auth required (called by PayOS server)
Router.post("/webhook/payos", receiptController.handlePayosWebhook);

// Auth required routes
Router.use(authMiddleware);
Router.use(injectUserBranch()); // Tự động inject branchId cho staff

// Get routes - list (đã được filter bởi injectUserBranch)
Router.get("/", receiptController.getAll);
Router.get("/date-range", receiptController.getByDateRange);
Router.get("/revenue", receiptController.getRevenue);
Router.get("/daily-revenue", receiptController.getDailyRevenue);
Router.get("/top-products", receiptController.getTopProducts);
Router.get("/stats", receiptController.getStats);
Router.get("/payment-status/:orderCode", receiptController.checkPaymentStatus);

// Get by code - cần validate branch access
Router.get(
  "/code/:code",
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getByCode(req.params.code);
    return receipt?.branchId;
  }),
  receiptController.getByCode
);

// Get by branch - cần check branch access
Router.get("/branch/:branchId", checkBranchAccess, receiptController.getByBranch);

// Get by ID - cần validate branch access
Router.get(
  "/:id",
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  receiptController.getById
);

// Create receipt (all authenticated staff can sell)
Router.post("/", receiptValidation.createReceipt, receiptController.create);

// Update receipt - Admin only
Router.patch("/:id", authorize("admin"), receiptController.update);

// Cancel receipt - Admin only
Router.patch("/:id/cancel", authorize("admin"), receiptController.cancel);

export const receiptRouter = Router;
