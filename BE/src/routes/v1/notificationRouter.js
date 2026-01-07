import express from "express";
import { notificationController } from "../../controllers/notificationController.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const Router = express.Router();

// Middleware to handle token from query params (for SSE)
const sseAuthMiddleware = (req, res, next) => {
  // If token is in query params, move it to header
  if (req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return authMiddleware(req, res, next);
};

// SSE endpoint - requires authentication
Router.get(
  "/stream",
  sseAuthMiddleware,
  notificationController.streamNotifications
);

// Stats endpoint (for debugging)
Router.get("/stats", authMiddleware, notificationController.getStats);

export const notificationRouter = Router;
