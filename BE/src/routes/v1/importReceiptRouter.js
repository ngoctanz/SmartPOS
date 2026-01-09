import express from "express";
import { importReceiptController } from "../../controllers/importReceiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch, validateRecordBranchAccess, checkBranchAccess } from "../../middlewares/branchMiddleware.js";
import { importReceiptService } from "../../services/importReceiptService.js";

const Router = express.Router();

Router.use(authMiddleware);

// Get routes - apply injectUserBranch để staff chỉ xem được chi nhánh của mình
Router.get("/", injectUserBranch(), importReceiptController.getAll);
Router.get("/date-range", injectUserBranch(), importReceiptController.getByDateRange);
Router.get("/total", injectUserBranch(), importReceiptController.getTotalImport);

// Error receipts routes
Router.get("/errors", injectUserBranch(), importReceiptController.getAllErrorReceipts);
Router.get("/errors/stats", injectUserBranch(), importReceiptController.getErrorStats);

// Get by code - cần validate branch access
Router.get(
  "/code/:code",
  validateRecordBranchAccess(async (req) => {
    const receipt = await importReceiptService.getByCode(req.params.code);
    return receipt?.branchId;
  }),
  importReceiptController.getByCode
);

// Get by barcode - cần validate branch access
Router.get(
  "/barcode/:barcode",
  validateRecordBranchAccess(async (req) => {
    const receipt = await importReceiptService.getByBarcode(req.params.barcode);
    return receipt?.branchId;
  }),
  importReceiptController.getByBarcode
);

// Get by branch - cần check branch access
Router.get("/branch/:branchId", checkBranchAccess, importReceiptController.getByBranch);

Router.get("/stats", injectUserBranch(), importReceiptController.getStats);

Router.get(
  "/:id",
  validateRecordBranchAccess(async (req) => {
    const receipt = await importReceiptService.getById(req.params.id);
    return receipt?.branchId;
  }),
  importReceiptController.getById
);


// Admin, Manager and Staff can create import receipts
Router.post(
  "/",
  authorize("admin", "manager", "staff"),
  injectUserBranch({ requireBranchForWrite: true }),
  receiptValidation.createImportReceipt,
  importReceiptController.create
);

// Confirm/Cancel - Admin and Manager only (staff cannot confirm/cancel)
Router.patch(
  "/:id/confirm",
  authorize("admin", "manager"),
  importReceiptController.confirm
);

Router.patch(
  "/:id/cancel",
  authorize("admin", "manager"),
  importReceiptController.cancel
);

// Mark as error - cho phép cả staff và admin (trong vòng 30 phút)
Router.patch(
  "/:id/mark-error",
  importReceiptController.markAsError
);

// Delete error receipt - Admin and Manager
Router.delete(
  "/errors/:id",
  authorize("admin", "manager"),
  importReceiptController.deleteErrorReceipt
);

export const importReceiptRouter = Router;
