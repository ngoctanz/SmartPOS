import express from "express";
import { uploadController } from "../../controllers/uploadController.js";
import { uploadMiddleware } from "../../middlewares/uploadMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

// Only authenticated users can upload
Router.use(authMiddleware);

Router.post(
  "/image",
  uploadMiddleware.single("image"),
  uploadController.uploadImage
);

export const uploadRouter = Router;
