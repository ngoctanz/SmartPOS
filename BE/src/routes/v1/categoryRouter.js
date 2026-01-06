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

Router.post(
  "/",
  authorize("admin", "user"),
  categoryValidation.create,
  categoryController.create
);

Router.put(
  "/:id",
  authorize("admin", "user"),
  categoryValidation.update,
  categoryController.update
);

Router.delete(
  "/:id",
  authorize("admin", "user"),
  categoryController.remove
);

export const categoryRouter = Router;
