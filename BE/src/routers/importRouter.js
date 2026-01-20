import express from "express";
import { importController } from "../controllers/importController.js";
import { uploadMiddleware } from "../middlewares/uploadMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Preview Excel data
router.post("/preview", uploadMiddleware.single("file"), importController.preview);

// Import products from Excel
router.post("/products", uploadMiddleware.single("file"), importController.importProducts);

// Import receipt from Excel (Create Import Receipt & optional Product creation)
router.post("/receipt", uploadMiddleware.single("file"), importController.importReceipt);

export const importRouter = router;
