import express from "express";
import { branchController } from "../../controllers/branchController.js";
import { branchValidation } from "../../validations/branchValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

Router.use(authMiddleware);

// Get routes (all authenticated users)
Router.get("/", branchController.getAll);
Router.get("/search", branchController.search);
Router.get("/:id", branchController.getById);

// Admin only
Router.post(
  "/",
  authorize("admin"),
  branchValidation.create,
  branchController.create
);

Router.put(
  "/:id",
  authorize("admin"),
  branchValidation.update,
  branchController.update
);

Router.delete(
  "/:id",
  authorize("admin"),
  branchController.remove
);

Router.post(
  "/delete-many",
  authorize("admin"),
  branchController.deleteMany
);

export const branchRouter = Router;
