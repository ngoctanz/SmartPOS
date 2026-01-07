import express from "express";
import { importReceiptController } from "../../controllers/importReceiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);

// Get routes - apply injectUserBranch để staff chỉ xem được chi nhánh của mình
Router.get("/", injectUserBranch, importReceiptController.getAll);
Router.get("/date-range", injectUserBranch, importReceiptController.getByDateRange);
Router.get("/total", injectUserBranch, importReceiptController.getTotalImport);
Router.get("/stats", injectUserBranch, importReceiptController.getStats);
Router.get("/code/:code", importReceiptController.getByCode);
Router.get("/barcode/:barcode", importReceiptController.getByBarcode);
Router.get("/branch/:branchId", importReceiptController.getByBranch);
Router.get("/:id", importReceiptController.getById);

// Admin only - tạo phiếu nhập cần branchId
Router.post(
  "/",
  authorize("admin"),
  injectUserBranch,
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
