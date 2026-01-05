import express from "express";
import { userValidation } from "../../validations/userValidation.js";
import { userController } from "../../controllers/userController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { registerLimiter } from "../../middlewares/rateLimitMiddleware.js";

const Router = express.Router();

Router.route("/")
  .get(authMiddleware, authorize("admin"), userController.getAllUser)
  .post(registerLimiter, userValidation.createdNew, userController.createdNew);

Router.get("/search", userController.searchUser);
Router.get("/:id", userController.detailUser);
Router.patch(
  "/update/:id",
  userValidation.validateUpdateData,
  userController.updateUser
);

export const userRouter = Router;
