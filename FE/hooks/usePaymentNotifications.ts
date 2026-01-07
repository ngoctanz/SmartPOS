"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "@/constants/config";

interface PaymentSuccessData {
  receiptCode: string;
  amount: number;
  timestamp: string;
}

interface PaymentNotificationOptions {
  onPaymentSuccess?: (data: PaymentSuccessData) => void;
  enabled?: boolean;
}

export function usePaymentNotifications({
  onPaymentSuccess,
  enabled = true,
}: PaymentNotificationOptions = {}) {
  const { isAuthenticated, user } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (!isAuthenticated || !user || !enabled) {
      return;
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Get token from localStorage
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.warn("[SSE] No access token found");
        return;
      }

      // Create EventSource with token in URL (since EventSource doesn't support headers)
      const url = `${API_BASE_URL}/notification/stream?token=${token}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("[SSE] Connection established");
        reconnectAttemptsRef.current = 0; // Reset reconnect counter
      };

      eventSource.addEventListener("payment-success", (event) => {
        try {
          const data: PaymentSuccessData = JSON.parse(event.data);
          console.log("[SSE] Payment success:", data);
          onPaymentSuccess?.(data);
        } catch (error) {
          console.error("[SSE] Failed to parse payment success data:", error);
        }
      });

      eventSource.addEventListener("heartbeat", () => {
        // Keep connection alive
        console.log("[SSE] Heartbeat received");
      });

      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error);
        eventSource.close();

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && enabled) {
          reconnectAttemptsRef.current++;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
          console.log(
            `[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log("[SSE] Max reconnect attempts reached or disabled");
        }
      };
    } catch (error) {
      console.error("[SSE] Failed to create EventSource:", error);
    }
  }, [isAuthenticated, user, enabled, onPaymentSuccess]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log("[SSE] Connection closed");
    }
  }, []);

  useEffect(() => {
    if (enabled && isAuthenticated && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, isAuthenticated, user, connect, disconnect]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnect: connect,
    disconnect,
  };
}
