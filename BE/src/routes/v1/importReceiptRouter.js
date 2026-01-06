import express from "express";
import { importReceiptController } from "../../controllers/importReceiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);
Router.use(injectUserBranch); // Tự động inject branchId cho staff

// Get routes
Router.get("/", importReceiptController.getAll);
Router.get("/date-range", importReceiptController.getByDateRange);
Router.get("/total", importReceiptController.getTotalImport);
Router.get("/code/:code", importReceiptController.getByCode);
Router.get("/barcode/:barcode", importReceiptController.getByBarcode);
Router.get("/branch/:branchId", importReceiptController.getByBranch);
Router.get("/:id", importReceiptController.getById);

// Admin only
Router.post(
  "/",
  authorize("admin"),
  receiptValidation.createImportReceipt,
  importReceiptController.create
);

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
