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
  fromDraft?: boolean; // True if payment was from draft receipt (QR preview)
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

    let handlePaymentSuccess: ((data: PaymentSuccessData) => void) | null = null;

    const connect = async () => {
      try {
        console.log("[Socket] Connecting with user:", user.userName);
        // Connect without token - cookie will be sent automatically
        socketService.connect();

        // Setup payment success listener
        handlePaymentSuccess = (data: PaymentSuccessData) => {
          console.log("[Socket] Payment success in hook:", data);
          onPaymentSuccessRef.current?.(data);
        };

        socketService.on("payment:success", handlePaymentSuccess);
        setIsConnected(true);
        connectAttemptedRef.current = true;

        console.log("[Socket] ✓ Hook connected");
      } catch (error) {
        console.error("[Socket] Connection error:", error);
        setIsConnected(false);
      }
    };

    connect();

    // Cleanup listener on unmount or dependency change
    return () => {
      if (handlePaymentSuccess) {
        socketService.off("payment:success", handlePaymentSuccess);
      }
    };
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

  // Update connection status (don't auto-reconnect - socket.io handles it)
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const checkConnection = () => {
      const connected = socketService.isConnected();
      setIsConnected(connected);
    };

    // Check connection status periodically (just for UI update, not reconnect)
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [enabled, isAuthenticated]);

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
