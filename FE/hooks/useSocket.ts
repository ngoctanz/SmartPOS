/**
 * useSocket Hook
 * React hook for managing WebSocket connections and events
 */

import { useEffect, useRef, useState } from "react";
import { socketService } from "@/service/socket.service";
import { useAuth } from "./useAuth";

interface PaymentSuccessData {
  receiptCode: string;
  amount: number;
  timestamp: string;
}

interface UseSocketOptions {
  onPaymentSuccess?: (data: PaymentSuccessData) => void;
  enabled?: boolean;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { onPaymentSuccess, enabled = true } = options;
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  const connectAttemptedRef = useRef(false);

  // Update callback ref when it changes
  useEffect(() => {
    onPaymentSuccessRef.current = onPaymentSuccess;
  }, [onPaymentSuccess]);

  // Connect to WebSocket
  useEffect(() => {
    if (!enabled || !isAuthenticated || !user || connectAttemptedRef.current) {
      return;
    }

    const connect = async () => {
      try {
        // Get access token from cookie (automatically sent by browser)
        // We need to extract it for socket.io auth
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("access_token="))
          ?.split("=")[1];

        if (!token) {
          console.error("[Socket] No access token found in cookies");
          return;
        }

        console.log("[Socket] Connecting with user:", user.username);
        socketService.connect(token);

        // Setup payment success listener
        const handlePaymentSuccess = (data: PaymentSuccessData) => {
          console.log("[Socket] Payment success in hook:", data);
          onPaymentSuccessRef.current?.(data);
        };

        socketService.on("payment:success", handlePaymentSuccess);
        setIsConnected(true);
        connectAttemptedRef.current = true;

        console.log("[Socket] ✓ Hook connected");

        // Cleanup listener on unmount
        return () => {
          socketService.off("payment:success", handlePaymentSuccess);
        };
      } catch (error) {
        console.error("[Socket] Connection error:", error);
        setIsConnected(false);
      }
    };

    connect();
  }, [enabled, isAuthenticated, user]);

  // Disconnect when auth changes
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("[Socket] Disconnecting due to auth loss");
      socketService.disconnect();
      setIsConnected(false);
      connectAttemptedRef.current = false;
    }
  }, [isAuthenticated]);

  // Update connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(socketService.isConnected());
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      if (connectAttemptedRef.current) {
        console.log("[Socket] Disconnecting on unmount");
        socketService.disconnect();
        connectAttemptedRef.current = false;
      }
    };
  }, []);

  return {
    isConnected,
    socket: socketService.getSocket(),
  };
};
