import express from "express";
import { userValidation } from "../../validations/userValidation.js";
import { userController } from "../../controllers/userController.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { registerLimiter } from "../../middlewares/rateLimitMiddleware.js";

const Router = express.Router();

Router.route("/")
  .get(authMiddleware, authorize("admin"), userController.getAllUser)
  .post(
    authMiddleware,
    authorize("admin"),
    registerLimiter,
    userValidation.createdNew,
    userController.createdNew
  );

Router.get(
  "/stats",
  authMiddleware,
  authorize("admin"),
  userController.getStats
);

Router.get(
  "/search",
  authMiddleware,
  authorize("admin"),
  userController.searchUser
);
Router.get(
  "/:id",
  authMiddleware,
  authorize("admin"),
  userController.detailUser
);
Router.patch(
  "/update/:id",
  authMiddleware,
  authorize("admin"),
  userValidation.validateUpdateData,
  userController.updateUser
);

// Toggle user status (lock/unlock)
Router.patch(
  "/toggle-status/:id",
  authMiddleware,
  authorize("admin"),
  userController.toggleUserStatus
);

// Bulk toggle status
Router.post(
  "/bulk-toggle-status",
  authMiddleware,
  authorize("admin"),
  userController.bulkToggleStatus
);

Router.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  userController.deleteUser
);

export const userRouter = Router;
