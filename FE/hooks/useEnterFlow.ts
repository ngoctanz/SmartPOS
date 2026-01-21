import * as React from "react";

/**
 * Flow phím Enter cho trang tạo hóa đơn
 * - Tiền mặt: IDLE → Tạo đơn + In → IDLE (cooldown 2s)
 * - Chuyển khoản: IDLE → QR_PREVIEW (Enter: In, O: Hoàn thành) → TRANSFER_SUCCESS (Enter: OK) → IDLE
 */

const SUBMIT_COOLDOWN = 2000;

export type EnterFlowState =
  | "IDLE"
  | "QR_PREVIEW"
  | "TRANSFER_SUCCESS";

interface UseEnterFlowOptions {
  paymentMethod: "cash" | "transfer";
  canSubmit: boolean;
  showQRPreview: boolean;
  showTransferSuccessDialog: boolean;
  onSubmit: () => void | Promise<void>;
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
  showQRPreview,
  showTransferSuccessDialog,
  onSubmit,
  onPrintDraft,
  onConfirmQR,
  onCloseTransferSuccess,
}: UseEnterFlowOptions): UseEnterFlowReturn {
  const [currentState, setCurrentState] = React.useState<EnterFlowState>("IDLE");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isOnCooldown, setIsOnCooldown] = React.useState(false);

  const refs = React.useRef({ currentState, isProcessing, isOnCooldown });
  React.useEffect(() => {
    refs.current = { currentState, isProcessing, isOnCooldown };
  }, [currentState, isProcessing, isOnCooldown]);

  React.useEffect(() => {
    if (showTransferSuccessDialog) {
      setCurrentState("TRANSFER_SUCCESS");
      return;
    }

    if (paymentMethod === "transfer" && showQRPreview) {
      setCurrentState("QR_PREVIEW");
    } else {
      setCurrentState("IDLE");
    }
  }, [paymentMethod, showQRPreview, showTransferSuccessDialog]);

  React.useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "o") return;
      if (refs.current.currentState !== "QR_PREVIEW") return;
      if (refs.current.isProcessing || refs.current.isOnCooldown) return;

      e.preventDefault();
      blurActiveInput();
      setIsProcessing(true);
      try {
        await onConfirmQR();
      } finally {
        setIsProcessing(false);
        setIsOnCooldown(true);
        setTimeout(() => setIsOnCooldown(false), SUBMIT_COOLDOWN);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onConfirmQR]);

  React.useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (refs.current.isProcessing || refs.current.isOnCooldown) return;

      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const inputValue = target.value?.trim() || "";
        if (inputValue.length > 0) return;
      }

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
            setIsOnCooldown(true);
            setTimeout(() => setIsOnCooldown(false), SUBMIT_COOLDOWN);
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
          setIsOnCooldown(true);
          setTimeout(() => setIsOnCooldown(false), SUBMIT_COOLDOWN);
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canSubmit, onSubmit, onPrintDraft, onCloseTransferSuccess]);

  const resetFlow = React.useCallback(() => {
    setCurrentState("IDLE");
    setIsProcessing(false);
    setIsOnCooldown(false);
  }, []);

  return { currentState, isProcessing, resetFlow };
}
