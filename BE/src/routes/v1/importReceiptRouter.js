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


// Admin only - tạo phiếu nhập cần branchId
Router.post(
  "/",
  authorize("admin"),
  injectUserBranch({ requireBranchForWrite: true }),
  receiptValidation.createImportReceipt,
  importReceiptController.create
);

// Confirm/Cancel - không cần branchId vì phiếu đã có sẵn
Router.patch(
  "/:id/confirm",
  authorize("admin"),
  importReceiptController.confirm
);

Router.patch(
  "/:id/cancel",
  authorize("admin"),
  importReceiptController.cancel
);

export const importReceiptRouter = Router;
