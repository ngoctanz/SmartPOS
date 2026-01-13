import * as React from "react";

/**
 * Flow phím Enter cho trang tạo hóa đơn
 *
 * Tiền mặt: IDLE → CASH_CONFIRM → CASH_SUCCESS (Enter 1: In, Enter 2: OK) → IDLE
 * Chuyển khoản: IDLE → QR_PREVIEW (Enter: In, O: Hoàn thành) → TRANSFER_SUCCESS (Enter: OK, P: In) → IDLE
 */

export type EnterFlowState =
  | "IDLE"
  | "CASH_CONFIRM"
  | "CASH_SUCCESS"
  | "QR_PREVIEW"
  | "TRANSFER_SUCCESS";

interface UseEnterFlowOptions {
  paymentMethod: "cash" | "transfer";
  canSubmit: boolean;
  showCashDialog: boolean;
  showCashSuccessDialog: boolean;
  showQRPreview: boolean;
  showTransferSuccessDialog: boolean;
  onSubmit: () => void | Promise<void>;
  onConfirmCash: () => void | Promise<void>;
  onPrintCashReceipt: () => void;
  onCloseCashSuccess: () => void;
  onPrintDraft: () => void;
  onConfirmQR: () => void | Promise<void>;
  onCloseTransferSuccess: () => void;
}

interface UseEnterFlowReturn {
  currentState: EnterFlowState;
  isProcessing: boolean;
  resetFlow: () => void;
}

function blurActiveInput(): void {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.blur();
  }
}

export function useEnterFlow({
  paymentMethod,
  canSubmit,
  showCashDialog,
  showCashSuccessDialog,
  showQRPreview,
  showTransferSuccessDialog,
  onSubmit,
  onConfirmCash,
  onPrintCashReceipt,
  onCloseCashSuccess,
  onPrintDraft,
  onConfirmQR,
  onCloseTransferSuccess,
}: UseEnterFlowOptions): UseEnterFlowReturn {
  const [currentState, setCurrentState] = React.useState<EnterFlowState>("IDLE");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [cashPrintCount, setCashPrintCount] = React.useState(0);

  const refs = React.useRef({ currentState, isProcessing, cashPrintCount });
  React.useEffect(() => {
    refs.current = { currentState, isProcessing, cashPrintCount };
  }, [currentState, isProcessing, cashPrintCount]);

  // Auto-sync state với dialog visibility
  // Ưu tiên: Transfer success > Cash success > Cash confirm > QR preview > IDLE
  React.useEffect(() => {
    // Transfer success dialog có thể hiện kể cả khi đang ở tab tiền mặt (webhook từ đơn cũ)
    if (showTransferSuccessDialog) {
      setCurrentState("TRANSFER_SUCCESS");
      return;
    }

    if (paymentMethod === "cash") {
      if (showCashSuccessDialog) {
        setCurrentState("CASH_SUCCESS");
        setCashPrintCount(0);
      } else if (showCashDialog) {
        setCurrentState("CASH_CONFIRM");
      } else {
        setCurrentState("IDLE");
        setCashPrintCount(0);
      }
    } else {
      if (showQRPreview) {
        setCurrentState("QR_PREVIEW");
      } else {
        setCurrentState("IDLE");
      }
    }
  }, [paymentMethod, showCashDialog, showCashSuccessDialog, showQRPreview, showTransferSuccessDialog]);

  // Phím O: Hoàn thành QR thủ công
  React.useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "o") return;
      if (refs.current.currentState !== "QR_PREVIEW") return;
      if (refs.current.isProcessing) return;

      e.preventDefault();
      blurActiveInput();
      setIsProcessing(true);
      try {
        await onConfirmQR();
      } finally {
        setIsProcessing(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onConfirmQR]);

  // Phím Enter
  React.useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (refs.current.isProcessing) return;

      const state = refs.current.currentState;

      switch (state) {
        case "IDLE":
          if (!canSubmit) return;
          e.preventDefault();
          blurActiveInput();
          setIsProcessing(true);
          try {
            await onSubmit();
          } finally {
            setIsProcessing(false);
          }
          break;

        case "CASH_CONFIRM":
          e.preventDefault();
          setIsProcessing(true);
          try {
            await onConfirmCash();
          } finally {
            setIsProcessing(false);
          }
          break;

        case "CASH_SUCCESS":
          e.preventDefault();
          if (refs.current.cashPrintCount === 0) {
            onPrintCashReceipt();
            setCashPrintCount(1);
          } else {
            onCloseCashSuccess();
          }
          break;

        case "QR_PREVIEW":
          e.preventDefault();
          blurActiveInput();
          onPrintDraft();
          break;

        case "TRANSFER_SUCCESS":
          e.preventDefault();
          onCloseTransferSuccess();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canSubmit, onSubmit, onConfirmCash, onPrintCashReceipt, onCloseCashSuccess, onPrintDraft, onCloseTransferSuccess]);

  const resetFlow = React.useCallback(() => {
    setCurrentState("IDLE");
    setIsProcessing(false);
    setCashPrintCount(0);
  }, []);

  return { currentState, isProcessing, resetFlow };
}
