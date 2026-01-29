/**
 * usePrinter Hook
 *
 * Hook quản lý logic in ấn thông minh cho POS
 * - Tự động kiểm tra trạng thái máy in
 * - Quyết định hiện dialog hay auto-print
 * - Cung cấp các hàm tiện ích
 *
 * @module usePrinter
 */

import * as React from "react";
import {
  getPrinterStatus,
  markPrinterConfigured,
  resetPrinterConfig,
  setAlwaysShowDialog,
  PrinterConfig,
  PrinterStatus,
} from "@/utils/printer-config";

// === Types ===

export interface UsePrinterOptions {
  /** ID của user hiện tại (để phân biệt giữa các ca) */
  userId?: string;
  /** Callback khi bắt đầu in */
  onPrintStart?: () => void;
  /** Callback khi in xong (sau khi dialog đóng) */
  onPrintEnd?: () => void;
  /** Callback khi có lỗi */
  onPrintError?: (error: Error) => void;
}

export interface UsePrinterReturn {
  /** Trạng thái máy in hiện tại */
  status: PrinterStatus;
  /** Config hiện tại */
  config: PrinterConfig;
  /** Máy in đã sẵn sàng (đã setup) */
  isReady: boolean;
  /** Cần hiện dialog setup không */
  needsSetup: boolean;
  /** Đang in */
  isPrinting: boolean;

  // Actions
  /** In hóa đơn - tự động quyết định dialog/silent */
  print: (html: string, title?: string) => Promise<void>;
  /** Force hiện dialog in (bỏ qua auto-print) */
  printWithDialog: (html: string, title?: string) => Promise<void>;
  /** Đánh dấu đã setup xong */
  markConfigured: () => void;
  /** Reset config để setup lại */
  resetConfig: () => void;
  /** Bật/tắt chế độ luôn hiện dialog */
  toggleAlwaysShowDialog: (value: boolean) => void;
  /** Refresh status (dùng sau khi thay đổi config) */
  refreshStatus: () => void;
}

// === Hidden Iframe Singleton ===

let printIframe: HTMLIFrameElement | null = null;

function getOrCreateIframe(): HTMLIFrameElement {
  if (!printIframe || !document.body.contains(printIframe)) {
    printIframe = document.createElement("iframe");
    printIframe.style.cssText =
      "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;";
    printIframe.id = "smartpos-print-iframe";
    document.body.appendChild(printIframe);
  }
  return printIframe;
}

// === Print Execution ===

/**
 * Thực hiện in với dialog (hiện print dialog của browser)
 */
function executePrintWithDialog(html: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const iframe = getOrCreateIframe();
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!doc) {
        throw new Error("Cannot access iframe document");
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
        </head>
        <body>${html}</body>
        </html>
      `);
      doc.close();

      // Wait for content to load
      const images = doc.getElementsByTagName("img");
      let loaded = 0;
      const total = images.length;
      let hasPrinted = false;

      const triggerPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;

        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          // Resolve after a short delay to allow print dialog to show
          setTimeout(resolve, 500);
        } catch (error) {
          reject(error);
        }
      };

      if (total > 0) {
        const onLoad = () => {
          loaded++;
          if (loaded >= total) {
            setTimeout(triggerPrint, 50);
          }
        };

        for (const img of images) {
          if (img.complete) {
            onLoad();
          } else {
            img.onload = onLoad;
            img.onerror = onLoad;
          }
        }

        // Fallback timeout
        setTimeout(triggerPrint, 1000);
      } else {
        setTimeout(triggerPrint, 50);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Thực hiện silent print (không hiện dialog)
 * Lưu ý: Browser vẫn có thể yêu cầu confirm tùy setting
 */
function executeSilentPrint(html: string, title: string): Promise<void> {
  // Trong browser, không thể thực sự silent print 100%
  // Nhưng ta có thể tối ưu để giảm delay
  return executePrintWithDialog(html, title);
}

// === Hook Implementation ===

export function usePrinter(options: UsePrinterOptions = {}): UsePrinterReturn {
  const { userId, onPrintStart, onPrintEnd, onPrintError } = options;

  // State
  const [status, setStatus] = React.useState<PrinterStatus>(() =>
    getPrinterStatus(userId),
  );
  const [isPrinting, setIsPrinting] = React.useState(false);

  // Refresh status
  const refreshStatus = React.useCallback(() => {
    setStatus(getPrinterStatus(userId));
  }, [userId]);

  // Effect: Refresh khi userId thay đổi
  React.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Effect: Listen for storage changes (cross-tab sync)
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "smartpos_printer_config") {
        refreshStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshStatus]);

  // === Print Function ===
  const print = React.useCallback(
    async (html: string, title: string = "Hóa đơn") => {
      if (isPrinting) {
        console.warn("[usePrinter] Already printing, ignoring...");
        return;
      }

      setIsPrinting(true);
      onPrintStart?.();

      try {
        const currentStatus = getPrinterStatus(userId);

        if (currentStatus.needsSetup) {
          // Lần đầu: Hiện dialog để user chọn máy in
          await executePrintWithDialog(html, title);
          // Sau khi user đã bấm Print, đánh dấu configured
          markPrinterConfigured(userId);
          refreshStatus();
        } else {
          // Đã setup: Silent print (vẫn hiện dialog nhưng nhanh hơn)
          await executeSilentPrint(html, title);
        }

        onPrintEnd?.();
      } catch (error) {
        console.error("[usePrinter] Print error:", error);
        onPrintError?.(error as Error);
      } finally {
        setIsPrinting(false);
      }
    },
    [isPrinting, userId, onPrintStart, onPrintEnd, onPrintError, refreshStatus],
  );

  // === Force Print With Dialog ===
  const printWithDialog = React.useCallback(
    async (html: string, title: string = "Hóa đơn") => {
      if (isPrinting) {
        console.warn("[usePrinter] Already printing, ignoring...");
        return;
      }

      setIsPrinting(true);
      onPrintStart?.();

      try {
        await executePrintWithDialog(html, title);
        // Cập nhật config sau khi print
        markPrinterConfigured(userId);
        refreshStatus();
        onPrintEnd?.();
      } catch (error) {
        console.error("[usePrinter] Print error:", error);
        onPrintError?.(error as Error);
      } finally {
        setIsPrinting(false);
      }
    },
    [isPrinting, userId, onPrintStart, onPrintEnd, onPrintError, refreshStatus],
  );

  // === Config Actions ===
  const markConfigured = React.useCallback(() => {
    markPrinterConfigured(userId);
    refreshStatus();
  }, [userId, refreshStatus]);

  const resetConfig = React.useCallback(() => {
    resetPrinterConfig();
    refreshStatus();
  }, [refreshStatus]);

  const toggleAlwaysShowDialog = React.useCallback(
    (value: boolean) => {
      setAlwaysShowDialog(value);
      refreshStatus();
    },
    [refreshStatus],
  );

  // === Return ===
  return {
    status,
    config: status.config,
    isReady: status.isReady,
    needsSetup: status.needsSetup,
    isPrinting,
    print,
    printWithDialog,
    markConfigured,
    resetConfig,
    toggleAlwaysShowDialog,
    refreshStatus,
  };
}

export default usePrinter;
