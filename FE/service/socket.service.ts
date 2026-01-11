/**
 * Socket.IO Client Service
 * Manages WebSocket connection for real-time notifications
 */

import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8081";

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000; // Start with 2s
  private maxReconnectDelay = 10000; // Max 10s between attempts
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private hasExhaustedRetries = false;

  constructor() {
    // Auto-reconnect when user comes back to the page
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => this.handleWindowFocus());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.handleWindowFocus();
        }
      });
    }
  }

  /**
   * Handle window focus - try to reconnect if disconnected
   */
  private handleWindowFocus() {
    if (this.socket && !this.socket.connected && this.hasExhaustedRetries) {
      console.log("[Socket] Window focused, attempting to reconnect...");
      this.hasExhaustedRetries = false;
      this.reconnectAttempts = 0;
      this.socket.connect();
    }
  }

  /**
   * Connect to WebSocket server
   * Token is optional - if not provided, will use httpOnly cookie
   */
  connect(token?: string): Socket {
    if (this.socket?.connected) {
      console.log("[Socket] Already connected");
      return this.socket;
    }

    console.log("[Socket] Connecting to:", SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: token ? { token } : undefined,
      withCredentials: true, // Send cookies automatically
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
      this.hasExhaustedRetries = false;
      console.log("[Socket] ✓ Connected successfully", this.socket?.id);
      // Socket.IO automatically preserves listeners after reconnect
      // No need to re-register payment:success listener here
    });

    this.socket.on("connected", (data) => {
      console.log("[Socket] Server confirmation:", data);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] ✗ Disconnected:", reason);
      // Don't clear listeners on disconnect - they'll be restored on reconnect
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      console.error(
        `[Socket] Connection error (attempt ${this.reconnectAttempts}):`,
        error.message
      );

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(
          "[Socket] Max reconnection attempts reached, will retry on window focus"
        );
        this.hasExhaustedRetries = true;
      }
    });

    this.socket.on("error", (error) => {
      console.error("[Socket] Error:", error);
    });

    // Payment success event
    this.socket.on("payment:success", (data) => {
      console.log("[Socket] 💰 Payment success received:", data);
      this.notifyListeners("payment:success", data);
    });

    // Pong response
    this.socket.on("pong", (data) => {
      console.log("[Socket] Pong received:", data);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      console.log("[Socket] Disconnecting...");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (data: unknown) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: unknown) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send ping to server
   */
  ping() {
    if (this.socket?.connected) {
      this.socket.emit("ping");
    }
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
