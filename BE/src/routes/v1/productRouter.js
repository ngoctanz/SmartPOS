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

// Admin only
Router.post(
  "/",
  authorize("admin"),
  productValidation.create,
  productController.create
);

Router.put(
  "/:id",
  authorize("admin"),
  productValidation.update,
  productController.update
);

Router.patch(
  "/:id/price",
  authorize("admin"),
  productValidation.updatePrice,
  productController.updateSalePrice
);

Router.delete(
  "/bulk",
  authorize("admin"),
  productController.removeMany
);

Router.delete("/:id", authorize("admin"), productController.remove);

export const productRouter = Router;
