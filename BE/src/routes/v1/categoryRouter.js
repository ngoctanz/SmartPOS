import express from "express";
import { categoryController } from "../../controllers/categoryController.js";
import { categoryValidation } from "../../validations/categoryValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

// Public routes (need auth)
Router.use(authMiddleware);

// Get routes
Router.get("/stats", categoryController.getStats);
Router.get("/", categoryController.getAll);
Router.get("/search", categoryController.search);
Router.get("/:id", categoryController.getById);

Router.post(
  "/",
  authorize("admin", "manager", "staff"),
  categoryValidation.create,
  categoryController.create
);

Router.put(
  "/:id",
  authorize("admin", "manager", "staff"),
  categoryValidation.update,
  categoryController.update
);

Router.delete(
  "/:id",
  authorize("admin", "manager", "staff"),
  categoryController.remove
);

Router.post(
  "/delete-many",
  authorize("admin", "manager", "staff"),
  categoryController.deleteMany
);

export const categoryRouter = Router;
