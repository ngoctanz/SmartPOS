  import express from "express";
import { receiptController } from "../../controllers/receiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import {
  injectUserBranch,
  validateRecordBranchAccess,
  checkBranchAccess,
} from "../../middlewares/branchMiddleware.js";
import { receiptService } from "../../services/receiptService.js";

const Router = express.Router();

// PayOS Webhook - No auth required (called by PayOS server)
Router.post("/webhook/payos", receiptController.handlePayosWebhook);

// Auth required routes
Router.use(authMiddleware);


// QR Preview routes
Router.post("/preview-qr", injectUserBranch(), receiptController.createQRPreview);
Router.post("/cancel-preview", injectUserBranch({ requireBranchForWrite: false }), receiptController.cancelQRPreview);
Router.post("/confirm-preview", injectUserBranch({ requireBranchForWrite: false }), receiptController.confirmQRPreview);
Router.get("/preview-qr/:orderCode", injectUserBranch({ requireBranchForWrite: false }), receiptController.getQRPreview);
Router.put("/preview-qr/:orderCode", injectUserBranch({ requireBranchForWrite: false }), receiptController.updateQRPreview);


Router.patch(
  "/:id/mark-error",
  authorize("admin", "manager", "staff"),
  injectUserBranch({ requireBranchForWrite: false }),
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  receiptController.markError
);

// Cancel receipt - Admin and Manager only
// branchId comes from the receipt itself
Router.patch(
  "/:id/cancel",
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  receiptController.cancel
);

// Delete error receipt - Admin and Manager only
// branchId comes from the receipt itself
Router.delete(
  "/errors/:id",
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  receiptController.deleteErrorReceipt
);

// Update receipt - Admin and Manager only
// branchId comes from the receipt itself
Router.patch(
  "/:id",
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  receiptController.update
);

// ============================================================================
// ROUTES THAT REQUIRE branchId (via global middleware)
// ============================================================================
Router.use(injectUserBranch());

// Get routes - list (filtered by injectUserBranch)
Router.get("/", receiptController.getAll);
Router.get("/errors", receiptController.getErrors);
Router.get("/errors/stats", receiptController.getErrorStats);
Router.get("/date-range", receiptController.getByDateRange);
Router.get("/revenue", receiptController.getRevenue);
Router.get("/daily-revenue", receiptController.getDailyRevenue);
Router.get("/top-products", receiptController.getTopProducts);
Router.get("/stats", receiptController.getStats);
Router.get("/payment-status/:orderCode", receiptController.checkPaymentStatus);

// Get by code - validate branch access
Router.get(
  "/code/:code",
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getByCode(req.params.code);
    return receipt?.branchId;
  }),
  receiptController.getByCode
);

// Get by branch - check branch access
Router.get(
  "/branch/:branchId",
  checkBranchAccess,
  receiptController.getByBranch
);

// Get by ID - validate branch access
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

export const receiptRouter = Router;
