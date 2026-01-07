import express from "express";
import { receiptController } from "../../controllers/receiptController.js";
import { receiptValidation } from "../../validations/receiptValidation.js";
import { authMiddleware, authorize } from "../../middlewares/authMiddleware.js";
import { injectUserBranch } from "../../middlewares/branchMiddleware.js";

const Router = express.Router();

// PayOS Webhook - No auth required (called by PayOS server)
Router.post("/webhook/payos", receiptController.handlePayosWebhook);

// Auth required routes
Router.use(authMiddleware);
Router.use(injectUserBranch); // Tự động inject branchId cho staff

// Get routes
Router.get("/", receiptController.getAll);
Router.get("/date-range", receiptController.getByDateRange);
Router.get("/revenue", receiptController.getRevenue);
Router.get("/daily-revenue", receiptController.getDailyRevenue);
Router.get("/top-products", receiptController.getTopProducts);
Router.get("/payment-status/:orderCode", receiptController.checkPaymentStatus);
Router.get("/code/:code", receiptController.getByCode);
Router.get("/branch/:branchId", receiptController.getByBranch);
Router.get("/:id", receiptController.getById);

// Create receipt (all authenticated staff can sell)
Router.post("/", receiptValidation.createReceipt, receiptController.create);

// Update receipt - Admin only
Router.patch("/:id", authorize("admin"), receiptController.update);

// Cancel receipt - Admin only
Router.patch("/:id/cancel", authorize("admin"), receiptController.cancel);

export const receiptRouter = Router;
