import express from "express";
import { productController } from "../../controllers/productController.js";
import { productValidation } from "../../validations/productValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);

// Get routes
Router.get("/", productController.getAll);
Router.get("/search", productController.search);
Router.get("/barcode/:barcode", productController.getByBarcode);
Router.get("/category/:categoryId", productController.getByCategory);
Router.get("/:id", productController.getById);

// Admin/Manager only
Router.post(
  "/",
  authorize("admin", "manager"),
  productValidation.create,
  productController.create
);

Router.put(
  "/:id",
  authorize("admin", "manager"),
  productValidation.update,
  productController.update
);

Router.patch(
  "/:id/price",
  authorize("admin", "manager"),
  productValidation.updatePrice,
  productController.updateSalePrice
);

Router.delete(
  "/:id",
  authorize("admin", "manager"),
  productController.remove
);

export const productRouter = Router;
