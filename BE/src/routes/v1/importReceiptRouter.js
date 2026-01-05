import express from "express";
import { importReceiptController } from "../../controllers/importReceiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);

// Get routes
Router.get("/", importReceiptController.getAll);
Router.get("/date-range", importReceiptController.getByDateRange);
Router.get("/total", importReceiptController.getTotalImport);
Router.get("/code/:code", importReceiptController.getByCode);
Router.get("/branch/:branchId", importReceiptController.getByBranch);
Router.get("/:id", importReceiptController.getById);

// Admin/Manager only
Router.post(
  "/",
  authorize("admin", "manager"),
  receiptValidation.createImportReceipt,
  importReceiptController.create
);

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

export const importReceiptRouter = Router;
