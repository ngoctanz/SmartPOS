/**
 * useReceiptPrint Hook
 *
 * Hook quản lý việc in hóa đơn cho POS
 * - Tích hợp với Fast Print Service và Print Queue
 * - Hỗ trợ smart print mode (lần đầu hiện dialog, sau đó auto)
 * - Track print jobs và handle callbacks
 * - Thread-safe với race condition protection
 *
 * @module useReceiptPrint
 */

"use client";

import * as React from "react";
import {
  fastPrintReceipt,
  fastPrintDraftWithQR,
  fastPrintCashPreview,
  cancelReceiptPrint,
  initFastPrint,
} from "@/utils/fast-print";
import {
  subscribeToQueue,
  getQueueState,
  startAutoCleanup,
  stopAutoCleanup,
  PrintQueueState,
  PrintJobStatus,
} from "@/utils/print-queue";
import {
  getPrinterStatus,
  markPrinterConfigured,
  resetPrinterConfig,
  PrinterStatus,
} from "@/utils/printer-config";
import { Receipt } from "@/service/receipt.service";
import { CartItem } from "@/components/receipt";

// === Types ===

export interface PrintJobInfo {
  jobId: string;
  receiptCode: string;
  status: PrintJobStatus;
  createdAt: number;
}

export interface UseReceiptPrintOptions {
  /** User ID cho smart print mode */
  userId?: string;
  /** Callback khi in thành công */
  onPrintSuccess?: (receiptCode: string) => void;
  /** Callback khi in lỗi */
  onPrintError?: (receiptCode: string, error: Error) => void;
  /** Tự động khởi tạo Fast Print service */
  autoInit?: boolean;
}

export interface UseReceiptPrintReturn {
  // === State ===
  /** Printer đã sẵn sàng (đã setup) */
  isPrinterReady: boolean;
  /** Cần setup máy in không */
  needsPrinterSetup: boolean;
  /** Queue đang xử lý */
  isProcessing: boolean;
  /** Số job đang pending */
  pendingJobsCount: number;
  /** Job đang in hiện tại */
  currentJob: PrintJobInfo | null;
  /** Danh sách jobs gần đây */
  recentJobs: PrintJobInfo[];

  // === Print Actions ===
  /**
   * In hóa đơn từ Receipt object
   * @returns Job ID
   */
  printReceipt: (
    receipt: Receipt,
    options?: {
      branchName?: string;
      branchAddress?: string;
      staffName?: string;
    },
  ) => string;

  /**
   * In draft với QR (cho transfer)
   * @returns Job ID
   */
  printDraftWithQR: (params: {
    code: string;
    cartItems: CartItem[];
    totalAmount: number;
    qrCode?: string;
    accountName?: string;
    accountNumber?: string;
    description?: string;
    branchName?: string;
    branchAddress?: string;
    staffName?: string;
  }) => string;

  /**
   * In cash preview
   * @returns Job ID
   */
  printCashPreview: (params: {
    code: string;
    cartItems: CartItem[];
    totalAmount: number;
    customerPaid?: number;
    branchName?: string;
    branchAddress?: string;
    staffName?: string;
  }) => string;

  /**
   * Hủy print jobs của một receipt
   */
  cancelPrint: (receiptCode: string) => number;

  // === Config Actions ===
  /**
   * Đánh dấu printer đã được cấu hình
   */
  markPrinterConfigured: () => void;

  /**
   * Reset printer config
   */
  resetPrinterConfig: () => void;

  /**
   * Refresh printer status
   */
  refreshPrinterStatus: () => void;
}

// === Hook Implementation ===

/**
 * Hook quản lý việc in hóa đơn
 */
export function useReceiptPrint(
  options: UseReceiptPrintOptions = {},
): UseReceiptPrintReturn {
  const { userId, onPrintSuccess, onPrintError, autoInit = true } = options;

  // === State ===
  const [printerStatus, setPrinterStatus] = React.useState<PrinterStatus>(() =>
    getPrinterStatus(userId),
  );
  const [queueState, setQueueState] = React.useState<PrintQueueState>(() =>
    getQueueState(),
  );

  // Refs để tránh stale closure trong callbacks
  const onPrintSuccessRef = React.useRef(onPrintSuccess);
  const onPrintErrorRef = React.useRef(onPrintError);
  const userIdRef = React.useRef(userId);

  // Update refs
  React.useEffect(() => {
    onPrintSuccessRef.current = onPrintSuccess;
    onPrintErrorRef.current = onPrintError;
    userIdRef.current = userId;
  }, [onPrintSuccess, onPrintError, userId]);

  // === Initialize ===
  React.useEffect(() => {
    if (autoInit) {
      initFastPrint();
      startAutoCleanup();
    }

    return () => {
      if (autoInit) {
        stopAutoCleanup();
      }
    };
  }, [autoInit]);

  // === Subscribe to Queue ===
  React.useEffect(() => {
    const unsubscribe = subscribeToQueue((state) => {
      setQueueState(state);
    });

    return unsubscribe;
  }, []);

  // === Refresh Printer Status ===
  const refreshPrinterStatus = React.useCallback(() => {
    setPrinterStatus(getPrinterStatus(userIdRef.current));
  }, []);

  React.useEffect(() => {
    refreshPrinterStatus();
  }, [userId, refreshPrinterStatus]);

  // Listen for storage changes (cross-tab sync)
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "smartpos_printer_config") {
        refreshPrinterStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshPrinterStatus]);

  // === Computed Values ===
  const pendingJobs = React.useMemo(
    () => queueState.jobs.filter((j) => j.status === "pending"),
    [queueState.jobs],
  );

  const currentJob: PrintJobInfo | null = React.useMemo(() => {
    if (!queueState.currentJob) return null;
    return {
      jobId: queueState.currentJob.id,
      receiptCode: queueState.currentJob.receiptCode,
      status: queueState.currentJob.status,
      createdAt: queueState.currentJob.createdAt,
    };
  }, [queueState.currentJob]);

  const recentJobs: PrintJobInfo[] = React.useMemo(
    () =>
      queueState.jobs
        .slice(-10)
        .reverse()
        .map((j) => ({
          jobId: j.id,
          receiptCode: j.receiptCode,
          status: j.status,
          createdAt: j.createdAt,
        })),
    [queueState.jobs],
  );

  // === Print Actions ===

  /**
   * Internal wrapper để add callbacks
   */
  const wrapWithCallbacks = React.useCallback(
    (receiptCode: string) => ({
      onComplete: () => {
        // Đánh dấu đã cấu hình sau lần in đầu tiên thành công
        if (!printerStatus.isReady) {
          markPrinterConfigured(userIdRef.current);
          refreshPrinterStatus();
        }
        onPrintSuccessRef.current?.(receiptCode);
      },
      onError: (error: Error) => {
        console.error(
          `[useReceiptPrint] Print failed for ${receiptCode}:`,
          error,
        );
        onPrintErrorRef.current?.(receiptCode, error);
      },
    }),
    [printerStatus.isReady, refreshPrinterStatus],
  );

  const printReceipt = React.useCallback(
    (
      receipt: Receipt,
      printOptions?: {
        branchName?: string;
        branchAddress?: string;
        staffName?: string;
      },
    ): string => {
      const callbacks = wrapWithCallbacks(receipt.code);

      return fastPrintReceipt(receipt, {
        ...printOptions,
        ...callbacks,
      });
    },
    [wrapWithCallbacks],
  );

  const printDraftWithQR = React.useCallback(
    (params: {
      code: string;
      cartItems: CartItem[];
      totalAmount: number;
      qrCode?: string;
      accountName?: string;
      accountNumber?: string;
      description?: string;
      branchName?: string;
      branchAddress?: string;
      staffName?: string;
    }): string => {
      const callbacks = wrapWithCallbacks(params.code);

      return fastPrintDraftWithQR({
        ...params,
        ...callbacks,
      });
    },
    [wrapWithCallbacks],
  );

  const printCashPreview = React.useCallback(
    (params: {
      code: string;
      cartItems: CartItem[];
      totalAmount: number;
      customerPaid?: number;
      branchName?: string;
      branchAddress?: string;
      staffName?: string;
    }): string => {
      const callbacks = wrapWithCallbacks(params.code);

      return fastPrintCashPreview({
        ...params,
        ...callbacks,
      });
    },
    [wrapWithCallbacks],
  );

  const cancelPrint = React.useCallback((receiptCode: string): number => {
    return cancelReceiptPrint(receiptCode);
  }, []);

  // === Config Actions ===

  const handleMarkPrinterConfigured = React.useCallback(() => {
    markPrinterConfigured(userIdRef.current);
    refreshPrinterStatus();
  }, [refreshPrinterStatus]);

  const handleResetPrinterConfig = React.useCallback(() => {
    resetPrinterConfig();
    refreshPrinterStatus();
  }, [refreshPrinterStatus]);

  // === Return ===
  return {
    // State
    isPrinterReady: printerStatus.isReady,
    needsPrinterSetup: printerStatus.needsSetup,
    isProcessing: queueState.isProcessing,
    pendingJobsCount: pendingJobs.length,
    currentJob,
    recentJobs,

    // Print Actions
    printReceipt,
    printDraftWithQR,
    printCashPreview,
    cancelPrint,

    // Config Actions
    markPrinterConfigured: handleMarkPrinterConfigured,
    resetPrinterConfig: handleResetPrinterConfig,
    refreshPrinterStatus,
  };
}

export default useReceiptPrint;
