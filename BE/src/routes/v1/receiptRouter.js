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

// ============================================================================
// PUBLIC ROUTES (No auth required)
// ============================================================================

// PayOS Webhook - No auth required (called by PayOS server)
Router.post("/webhook/payos", receiptController.handlePayosWebhook);

// ============================================================================
// PROTECTED ROUTES (Auth required) - Apply authMiddleware individually
// ============================================================================

// QR Preview routes
Router.post("/preview-qr", authMiddleware, injectUserBranch(), receiptController.createQRPreview);
Router.post("/cancel-preview", authMiddleware, injectUserBranch({ requireBranchForWrite: false }), receiptController.cancelQRPreview);
Router.post("/confirm-preview", authMiddleware, injectUserBranch({ requireBranchForWrite: false }), receiptController.confirmQRPreview);
Router.get("/preview-qr/:orderCode", authMiddleware, injectUserBranch({ requireBranchForWrite: false }), receiptController.getQRPreview);
Router.put("/preview-qr/:orderCode", authMiddleware, injectUserBranch({ requireBranchForWrite: false }), receiptController.updateQRPreview);

Router.patch(
  "/:id/mark-error",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  injectUserBranch({ requireBranchForWrite: false }),
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  receiptController.markError
);

// Cancel receipt - Admin and Manager only
Router.patch(
  "/:id/cancel",
  authMiddleware,
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  receiptController.cancel
);

// Delete error receipt - Admin and Manager only
Router.delete(
  "/errors/:id",
  authMiddleware,
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  receiptController.deleteErrorReceipt
);

// Delete multiple receipts - Admin and Manager only
Router.post(
  "/delete-many",
  authMiddleware,
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  receiptController.deleteManyReceipts
);

// Delete receipts by month - Admin and Manager only
Router.post(
  "/delete-by-month",
  authMiddleware,
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  receiptController.deleteReceiptsByMonth
);

// Delete single receipt - Admin and Manager only
Router.delete(
  "/:id",
  authMiddleware,
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  receiptController.deleteReceipt
);

// Update receipt - Admin and Manager only
Router.patch(
  "/:id",
  authMiddleware,
  authorize("admin", "manager"),
  injectUserBranch({ requireBranchForWrite: false }),
  receiptController.update
);

// ============================================================================
// ROUTES THAT REQUIRE branchId
// ============================================================================

// Get routes - list (filtered by injectUserBranch)
Router.get("/", authMiddleware, injectUserBranch(), receiptController.getAll);
Router.get("/errors", authMiddleware, injectUserBranch(), receiptController.getErrors);
Router.get("/errors/stats", authMiddleware, injectUserBranch(), receiptController.getErrorStats);
Router.get("/date-range", authMiddleware, injectUserBranch(), receiptController.getByDateRange);
Router.get("/revenue", authMiddleware, injectUserBranch(), receiptController.getRevenue);
Router.get("/daily-revenue", authMiddleware, injectUserBranch(), receiptController.getDailyRevenue);
Router.get("/top-products", authMiddleware, injectUserBranch(), receiptController.getTopProducts);
Router.get("/stats", authMiddleware, injectUserBranch(), receiptController.getStats);
Router.get("/payment-status/:orderCode", authMiddleware, injectUserBranch(), receiptController.checkPaymentStatus);

// Get by code - validate branch access
Router.get(
  "/code/:code",
  authMiddleware,
  injectUserBranch(),
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getByCode(req.params.code);
    return receipt?.branchId;
  }),
  receiptController.getByCode
);

// Get by branch - check branch access
Router.get(
  "/branch/:branchId",
  authMiddleware,
  injectUserBranch(),
  checkBranchAccess,
  receiptController.getByBranch
);

// Get by ID - validate branch access
Router.get(
  "/:id",
  authMiddleware,
  injectUserBranch(),
  validateRecordBranchAccess(async (req) => {
    const receipt = await receiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  receiptController.getById
);

// Create receipt (all authenticated staff can sell)
Router.post("/", authMiddleware, injectUserBranch(), receiptValidation.createReceipt, receiptController.create);

export const receiptRouter = Router;
