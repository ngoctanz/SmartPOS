import { useEffect, useRef, useState } from "react";
import { socketService } from "@/service/socket.service";
import { useAuth } from "./useAuth";

interface PaymentSuccessData {
  receiptCode: string;
  amount: number;
  timestamp: string;
  fromDraft?: boolean;
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
    // Disconnect and cleanup if conditions not met
    if (!enabled || !isAuthenticated || !user) {
      if (connectAttemptedRef.current) {
        console.log("[Socket] Disconnecting due to condition change");
        socketService.disconnect();
        connectAttemptedRef.current = false;
      }
      // Defer setState to avoid cascading renders warning
      queueMicrotask(() => setIsConnected(false));
      return;
    }

    // Already connected
    if (connectAttemptedRef.current) {
      return;
    }

    let handlePaymentSuccess: ((data: unknown) => void) | null = null;

    const connect = async () => {
      try {
        console.log("[Socket] Connecting with user:", user.userName);
        // Connect without token - cookie will be sent automatically
        socketService.connect();

        // Setup payment success listener
        handlePaymentSuccess = (data: unknown) => {
          const paymentData = data as PaymentSuccessData;
          console.log("[Socket] Payment success in hook:", paymentData);
          onPaymentSuccessRef.current?.(paymentData);
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

  // NOTE: We intentionally do NOT disconnect on unmount because:
  // 1. Socket is a global singleton shared across multiple useSocket instances
  // 2. Disconnecting should only happen on logout (handled by isAuthenticated check above)
  // 3. Each instance only removes its own listener on unmount (handled in connect effect cleanup)

  return {
    isConnected,
    socket: socketService.getSocket(),
  };
};
