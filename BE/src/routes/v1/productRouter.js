import express from "express";
import { productController } from "../../controllers/productController.js";
import { productValidation } from "../../validations/productValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);

// Get routes - inject branchId cho staff để lấy giá theo chi nhánh
Router.get("/stats", productController.getStats);
Router.get("/", productController.getAll);
Router.get("/search", injectUserBranch({ requireBranchForWrite: false }), productController.search);
Router.get("/barcode/:barcode", injectUserBranch({ requireBranchForWrite: false }), productController.getByBarcode);
Router.get("/category/:categoryId", productController.getByCategory);
Router.get("/:id", injectUserBranch({ requireBranchForWrite: false }), productController.getById);

// Admin, Manager and Staff can manage products
Router.post(
  "/",
  authorize("admin", "manager", "staff"),
  productValidation.create,
  productController.create
);

Router.put(
  "/:id",
  authorize("admin", "manager", "staff"),
  productValidation.update,
  productController.update
);

Router.patch(
  "/:id/price",
  authorize("admin", "manager", "staff"),
  productValidation.updatePrice,
  productController.updateSalePrice
);

Router.delete(
  "/bulk",
  authorize("admin", "manager", "staff"),
  productController.removeMany
);

Router.delete("/:id", authorize("admin", "manager", "staff"), productController.remove);

export const productRouter = Router;
