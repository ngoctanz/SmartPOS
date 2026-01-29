import * as React from "react";

/**
 * useEnterFlow Hook
 * 
 * Quản lý flow phím Enter cho trang tạo hóa đơn
 * 
 * Flow tiền mặt:
 * IDLE → [Enter] Tạo đơn + In → IDLE (cooldown 300ms)
 * 
 * Flow chuyển khoản:
 * IDLE → [Enter] Tạo draft → QR_PREVIEW → [Enter] In bill / [O] Hoàn thành
 *     → TRANSFER_SUCCESS → [Enter] OK → IDLE
 * 
 * Features:
 * - Race condition protection với refs
 * - Validation draft data trước khi in/confirm
 * - Cooldown chỉ áp dụng cho tiền mặt và close dialog
 * - Auto blur input khi xử lý
 */

const SUBMIT_COOLDOWN = 300;

export type EnterFlowState = "IDLE" | "QR_PREVIEW" | "TRANSFER_SUCCESS";

interface UseEnterFlowOptions {
  paymentMethod: "cash" | "transfer";
  canSubmit: boolean;
  showQRPreview: boolean;
  showTransferSuccessDialog: boolean;
  onSubmit: () => void | Promise<void>;
  onPrintDraft: () => void;
  onConfirmQR: () => void | Promise<void>;
  onCloseTransferSuccess: () => void;
  /** Validation: draft data đã sẵn sàng để in/confirm */
  canPrintDraft?: boolean;
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
  canPrintDraft = true,
}: UseEnterFlowOptions): UseEnterFlowReturn {
  const [currentState, setCurrentState] =
    React.useState<EnterFlowState>("IDLE");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isOnCooldown, setIsOnCooldown] = React.useState(false);

  // Sync state to refs để tránh stale closure
  const refs = React.useRef({ currentState, isProcessing, isOnCooldown, canPrintDraft });
  React.useEffect(() => {
    refs.current = { currentState, isProcessing, isOnCooldown, canPrintDraft };
  }, [currentState, isProcessing, isOnCooldown, canPrintDraft]);

  // Update state dựa trên props
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

  // Handler cho phím "O" (confirm QR)
  React.useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "o") return;
      if (refs.current.currentState !== "QR_PREVIEW") return;
      if (refs.current.isProcessing || refs.current.isOnCooldown) return;

      // Validation: draft data phải sẵn sàng
      if (!refs.current.canPrintDraft) {
        console.warn("[EnterFlow] Draft data not ready, cannot confirm");
        return;
      }

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

  // Handler cho phím Enter
  React.useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (refs.current.isProcessing) return;

      const state = refs.current.currentState;
      const target = e.target as HTMLElement;

      // === QR_PREVIEW hoặc TRANSFER_SUCCESS: Xử lý Enter ngay ===
      if (state === "QR_PREVIEW" || state === "TRANSFER_SUCCESS") {
        if (state === "TRANSFER_SUCCESS" && refs.current.isOnCooldown) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        blurActiveInput();

        if (state === "QR_PREVIEW") {
          // Validation: draft data phải sẵn sàng
          if (!refs.current.canPrintDraft) {
            console.warn("[EnterFlow] Draft data not ready, skipping print");
            return;
          }
          onPrintDraft();
        } else {
          onCloseTransferSuccess();
          setIsOnCooldown(true);
          setTimeout(() => setIsOnCooldown(false), SUBMIT_COOLDOWN);
        }
        return;
      }

      // === IDLE: Check cooldown và input value ===
      if (refs.current.isOnCooldown) return;

      // Bỏ qua nếu đang nhập text trong input
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        const inputValue = target.value?.trim() || "";
        if (inputValue.length > 0) return;
      }

      if (state === "IDLE") {
        if (!canSubmit) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        blurActiveInput();
        
        setIsProcessing(true);
        try {
          await onSubmit();
        } finally {
          setIsProcessing(false);
          // Chỉ cooldown cho tiền mặt (chuyển khoản chuyển sang QR_PREVIEW ngay)
          if (paymentMethod === "cash") {
            setIsOnCooldown(true);
            setTimeout(() => setIsOnCooldown(false), SUBMIT_COOLDOWN);
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canSubmit, onSubmit, onPrintDraft, onCloseTransferSuccess, paymentMethod]);

  const resetFlow = React.useCallback(() => {
    setCurrentState("IDLE");
    setIsProcessing(false);
    setIsOnCooldown(false);
  }, []);

  return { currentState, isProcessing, resetFlow };
}
