/**
 * WebSocket Service using Socket.IO
 * Manages real-time bidirectional communication for payment notifications
 */

import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;
const connectedClients = new Map(); // Map of socket.id -> { socketId, userId, branchId, username }

/**
 * Initialize Socket.IO server
 * @param {object} server - HTTP server instance
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "https://noibo.lanchuyenhangsale.com",
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get token from handshake auth or query
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        console.log("[Socket] Connection rejected: No token provided");
        return next(new Error("Authentication required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        userId: decoded.userId,
        username: decoded.username,
        branchId: decoded.branchId || "all",
        role: decoded.role,
      };

      console.log(
        `[Socket] ✓ Authentication successful for user: ${decoded.username} (branch: ${socket.user.branchId})`
      );
      next();
    } catch (error) {
      console.log(`[Socket] Authentication failed:`, error.message);
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const { userId, username, branchId } = socket.user;

    // Store client info
    connectedClients.set(socket.id, {
      socketId: socket.id,
      userId,
      username,
      branchId,
    });

    // Join branch room
    socket.join(`branch:${branchId}`);

    // Admin users also join "all" room to receive notifications from all branches
    if (socket.user.role === "admin") {
      socket.join("branch:all");
      console.log(`[Socket] Admin user joined 'all' room`);
    }

    console.log(
      `[Socket] ✓ Client connected: ${username} (${socket.id}) - Branch: ${branchId}`
    );
    console.log(`[Socket] Total connected clients: ${connectedClients.size}`);

    // Send connection confirmation
    socket.emit("connected", {
      message: "Connected to WebSocket server",
      branchId,
      userId,
    });

    // Handle client disconnect
    socket.on("disconnect", (reason) => {
      connectedClients.delete(socket.id);
      console.log(
        `[Socket] ✗ Client disconnected: ${username} (${socket.id}) - Reason: ${reason}`
      );
      console.log(`[Socket] Total connected clients: ${connectedClients.size}`);
    });

    // Handle ping-pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });
  });

  console.log("[Socket] ✓ WebSocket server initialized");
  return io;
};

/**
 * Broadcast payment success notification to all clients in a branch
 * @param {string} branchId - Branch ID
 * @param {object} paymentData - Payment data {receiptCode, amount, timestamp}
 */
export const broadcastPaymentSuccess = (branchId, paymentData) => {
  if (!io) {
    console.error("[Socket] Socket.IO not initialized");
    return;
  }

  const notification = {
    receiptCode: paymentData.receiptCode,
    amount: paymentData.amount,
    timestamp: paymentData.timestamp || new Date().toISOString(),
  };

  // Broadcast to all clients in the branch room
  const branchRoom = `branch:${branchId}`;
  io.to(branchRoom).emit("payment:success", notification);

  // Also broadcast to admin "all" room so admins receive notifications from all branches
  const adminRoom = "branch:all";
  io.to(adminRoom).emit("payment:success", notification);

  // Get room sizes for logging
  const branchRoomSize = io.sockets.adapter.rooms.get(branchRoom)?.size || 0;
  const adminRoomSize = io.sockets.adapter.rooms.get(adminRoom)?.size || 0;

  console.log(
    `[Socket] 📢 Broadcasting payment success to branch ${branchId} (${branchRoomSize} branch clients, ${adminRoomSize} admin clients):`,
    notification
  );
};

/**
 * Get total connected clients count
 */
export const getConnectedClientsCount = () => {
  return connectedClients.size;
};

/**
 * Get connected clients by branch
 */
export const getClientsByBranch = (branchId) => {
  const clients = [];
  connectedClients.forEach((client) => {
    if (client.branchId === branchId) {
      clients.push(client);
    }
  });
  return clients;
};

/**
 * Get Socket.IO server instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export const socketService = {
  initializeSocket,
  broadcastPaymentSuccess,
  getConnectedClientsCount,
  getClientsByBranch,
  getIO,
};
