import express from "express";
import { categoryController } from "../../controllers/categoryController.js";
import { categoryValidation } from "../../validations/categoryValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

// Public routes (need auth)
Router.use(authMiddleware);

Router.get("/", categoryController.getAll);
Router.get("/search", categoryController.search);
Router.get("/:id", categoryController.getById);

// Admin/Manager only
Router.post(
  "/",
  authorize("admin", "manager"),
  categoryValidation.create,
  categoryController.create
);

Router.put(
  "/:id",
  authorize("admin", "manager"),
  categoryValidation.update,
  categoryController.update
);

Router.delete(
  "/:id",
  authorize("admin", "manager"),
  categoryController.remove
);

export const categoryRouter = Router;
