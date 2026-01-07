import { notificationService } from "../services/notificationService.js";

/**
 * SSE endpoint for real-time notifications
 * GET /notification/stream
 */
export const streamNotifications = async (req, res) => {
  const user = req.user;
  const branchId = user.branchId || "all";

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", branchId })}\n\n`);

  // Add client to notification service
  notificationService.addClient(branchId, res);

  // Keep connection alive with heartbeat
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(heartbeatInterval);
    notificationService.removeClient(branchId, res);
    res.end();
  });
};

/**
 * Get notification stats (for debugging)
 * GET /notification/stats
 */
export const getStats = async (req, res) => {
  const count = notificationService.getConnectedClientsCount();
  res.json({
    success: true,
    data: {
      connectedClients: count,
    },
  });
};

export const notificationController = {
  streamNotifications,
  getStats,
};
