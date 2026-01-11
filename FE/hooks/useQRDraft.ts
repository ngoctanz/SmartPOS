import * as React from "react";
import receiptService, {
  QRPreviewResponse,
  Receipt,
} from "@/service/receipt.service";
import { toast } from "sonner";
import { CartItem } from "@/components/receipt";

const DEBOUNCE_TIME = 1500;
const QR_COOLDOWN_TIME = 3000;

interface UseQRDraftOptions {
  cartItems: CartItem[];
  branchId?: string;
  isAdmin: boolean;
  paymentMethod: "cash" | "transfer";
  onPaymentSuccess?: (receipt: Receipt) => void;
}

type SuccessType = "manual" | "paid";

interface UseQRDraftReturn {
  draftData: QRPreviewResponse | null;
  isCreatingDraft: boolean;
  isConfirmingDraft: boolean;
  showQRPreview: boolean;
  remainingTime: string;
  isExpired: boolean;
  completedReceipt: Receipt | null;
  showSuccessDialog: boolean;
  successType: SuccessType;
  createDraft: () => Promise<void>;
  confirmDraft: () => Promise<void>;
  cancelDraft: () => void;
  resetAfterSuccess: () => void;
  closeSuccessDialog: () => void;
  handleWebhookPaymentSuccess: (receipt: Receipt) => void;
}

export function useQRDraft({
  cartItems,
  branchId,
  isAdmin,
  paymentMethod,
  onPaymentSuccess,
}: UseQRDraftOptions): UseQRDraftReturn {
  const [draftData, setDraftData] = React.useState<QRPreviewResponse | null>(
    null
  );
  const [isCreatingDraft, setIsCreatingDraft] = React.useState(false);
  const [isConfirmingDraft, setIsConfirmingDraft] = React.useState(false);
  const [showQRPreview, setShowQRPreview] = React.useState(false);
  const [remainingTime, setRemainingTime] = React.useState("");
  const [isExpired, setIsExpired] = React.useState(false);
  const [completedReceipt, setCompletedReceipt] =
    React.useState<Receipt | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [successType, setSuccessType] = React.useState<SuccessType>("manual");

  // Refs để tránh race condition và tracking state
  const currentOrderCodeRef = React.useRef<number | null>(null);
  const currentReceiptCodeRef = React.useRef<string | null>(null); // Track receiptCode riêng
  const prevCartItemsRef = React.useRef<string>("");
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = React.useRef(false);
  const isFirstRenderRef = React.useRef(true);
  const isCreatingRef = React.useRef(false);
  const isCancellingRef = React.useRef(false);
  const isConfirmingRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const isHandlingWebhookRef = React.useRef(false); // Track webhook handling

  const cancelDraftByOrderCode = React.useCallback(
    (orderCode: number): void => {
      receiptService.cancelQRPreview(orderCode).catch(() => {
        // Ignore errors - draft may already be deleted (TTL or manual)
      });
    },
    []
  );

  const resetQRState = React.useCallback(() => {
    if (!isMountedRef.current) return;
    setDraftData(null);
    currentOrderCodeRef.current = null;
    currentReceiptCodeRef.current = null;
    setShowQRPreview(false);
    setRemainingTime("");
    setIsExpired(false);
  }, []);

  const createDraftInternal = React.useCallback(
    async (skipCooldown = false): Promise<boolean> => {
      if (isAdmin && !branchId) {
        toast.error("Vui lòng chọn chi nhánh");
        return false;
      }

      if (cartItems.length === 0) {
        toast.error("Vui lòng thêm sản phẩm vào giỏ hàng");
        return false;
      }

      if (!skipCooldown && cooldownRef.current) {
        toast.warning("Vui lòng đợi vài giây trước khi tạo mã QR mới");
        return false;
      }

      if (
        isCreatingRef.current ||
        isCancellingRef.current ||
        isConfirmingRef.current
      ) {
        return false;
      }

      isCreatingRef.current = true;
      if (isMountedRef.current) setIsCreatingDraft(true);

      const oldOrderCode = currentOrderCodeRef.current;

      try {
        const response = await receiptService.createQRPreview({
          ...(isAdmin && { branchId }),
          listProduct: cartItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            salePrice: item.salePrice,
          })),
        });

        if (!isMountedRef.current) {
          if (response.success && response.data) {
            cancelDraftByOrderCode(response.data.orderCode);
          }
          return false;
        }

        if (response.success && response.data) {
          // Defensive check - đảm bảo BE trả về đủ data
          if (!response.data.orderCode || !response.data.receiptCode) {
            toast.error("Dữ liệu mã QR không hợp lệ");
            return false;
          }

          // Set new draft data
          setDraftData(response.data);
          currentOrderCodeRef.current = response.data.orderCode;
          currentReceiptCodeRef.current = response.data.receiptCode;
          setShowQRPreview(true);
          setIsExpired(false);

          // Cancel old draft nếu có (tạo mới thay thế)
          if (oldOrderCode && oldOrderCode !== response.data.orderCode) {
            cancelDraftByOrderCode(oldOrderCode);
          }

          cooldownRef.current = true;
          setTimeout(() => {
            cooldownRef.current = false;
          }, QR_COOLDOWN_TIME);

          return true;
        } else {
          toast.error(response.message || "Không thể tạo mã QR");
          return false;
        }
      } catch (error) {
        if (isMountedRef.current) {
          toast.error((error as Error).message || "Lỗi tạo mã QR");
        }
        return false;
      } finally {
        if (isMountedRef.current) setIsCreatingDraft(false);
        isCreatingRef.current = false;
      }
    },
    [isAdmin, branchId, cartItems, cancelDraftByOrderCode]
  );

  const createDraft = React.useCallback(async () => {
    await createDraftInternal(false);
  }, [createDraftInternal]);

  const confirmDraft = React.useCallback(async () => {
    if (!draftData || !draftData.orderCode) return;

    if (
      isConfirmingRef.current ||
      isCreatingRef.current ||
      isCancellingRef.current ||
      isHandlingWebhookRef.current // Skip nếu webhook đang xử lý
    ) {
      return;
    }

    isConfirmingRef.current = true;
    if (isMountedRef.current) setIsConfirmingDraft(true);

    const orderCodeToConfirm = draftData.orderCode;

    try {
      const response = await receiptService.confirmQRPreview(
        orderCodeToConfirm
      );

      if (!isMountedRef.current) return;

      // Nếu webhook đã xử lý trong lúc đang confirm → không làm gì thêm
      if (isHandlingWebhookRef.current) {
        return;
      }

      if (response.success && response.data) {
        const receipt = response.data;

        // Backend trả về receipt với status hiện tại:
        // - "completed" nếu webhook đã thanh toán trước
        // - "pending" nếu mới được confirm
        const isPaid = receipt.status === "completed";

        setCompletedReceipt(receipt);
        resetQRState();
        setSuccessType(isPaid ? "paid" : "manual");
        setShowSuccessDialog(true);

        onPaymentSuccess?.(receipt);
      } else {
        toast.error(response.message || "Lưu hóa đơn thất bại");
      }
    } catch (error) {
      if (isMountedRef.current) {
        toast.error((error as Error).message || "Lỗi lưu hóa đơn");
      }
    } finally {
      if (isMountedRef.current) setIsConfirmingDraft(false);
      isConfirmingRef.current = false;
    }
  }, [draftData, onPaymentSuccess, resetQRState]);

  const cancelDraft = React.useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (isCancellingRef.current || isConfirmingRef.current) {
      return;
    }

    isCancellingRef.current = true;

    const orderCodeToCancel = currentOrderCodeRef.current;
    if (orderCodeToCancel) {
      cancelDraftByOrderCode(orderCodeToCancel);
    }

    resetQRState();
    isCancellingRef.current = false;
  }, [cancelDraftByOrderCode, resetQRState]);

  const resetAfterSuccess = React.useCallback(() => {
    if (!isMountedRef.current) return;
    setShowSuccessDialog(false);
    setCompletedReceipt(null);
  }, []);

  const closeSuccessDialog = React.useCallback(() => {
    if (isMountedRef.current) setShowSuccessDialog(false);
  }, []);

  // Xử lý khi webhook báo thanh toán thành công
  // Được gọi từ page sau khi đã verify receiptCode khớp với current draft
  const handleWebhookPaymentSuccess = React.useCallback(
    (receipt: Receipt) => {
      if (!isMountedRef.current) return;

      // Prevent duplicate handling
      if (isHandlingWebhookRef.current) return;

      // Nếu đang confirm thì để confirmDraft xử lý (nó sẽ nhận receipt với status=completed)
      if (isConfirmingRef.current) {
        return;
      }

      isHandlingWebhookRef.current = true;

      // Reset QR state (sẽ clear currentOrderCodeRef và currentReceiptCodeRef)
      resetQRState();

      // Set completed receipt và show dialog
      setCompletedReceipt(receipt);
      setSuccessType("paid");
      setShowSuccessDialog(true);

      // Callback
      onPaymentSuccess?.(receipt);

      // Reset flag sau một delay ngắn
      setTimeout(() => {
        isHandlingWebhookRef.current = false;
      }, 500); // Tăng lên 500ms để đảm bảo confirmDraft đã xong
    },
    [resetQRState, onPaymentSuccess]
  );

  // Countdown timer
  React.useEffect(() => {
    if (!draftData?.expiresAt) {
      setRemainingTime("");
      setIsExpired(false);
      return;
    }

    const updateTime = () => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      const expiry = new Date(draftData.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setRemainingTime("Đã hết hạn");
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [draftData?.expiresAt]);

  // Xử lý khi cart thay đổi trong lúc đang hiện QR
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevCartItemsRef.current = JSON.stringify(cartItems);
      return;
    }

    // Chỉ xử lý khi: đang hiện QR + có orderCode + payment là transfer
    if (
      !showQRPreview ||
      !currentOrderCodeRef.current ||
      paymentMethod !== "transfer"
    ) {
      prevCartItemsRef.current = JSON.stringify(cartItems);
      return;
    }

    const currentCartStr = JSON.stringify(cartItems);
    if (currentCartStr === prevCartItemsRef.current) {
      return;
    }

    prevCartItemsRef.current = currentCartStr;

    // Skip if busy with other operations
    if (
      isCreatingRef.current ||
      isConfirmingRef.current ||
      isCancellingRef.current
    ) {
      return;
    }

    // Capture orderCode để cancel (trước khi reset)
    const orderCodeToCancel = currentOrderCodeRef.current;

    // UI reset NGAY LẬP TỨC - không debounce
    isCancellingRef.current = true;
    resetQRState();
    isCancellingRef.current = false;

    // API cancel DEBOUNCE - tránh spam API khi sửa cart liên tục
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (orderCodeToCancel && isMountedRef.current) {
        cancelDraftByOrderCode(orderCodeToCancel);
      }
    }, DEBOUNCE_TIME);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [
    cartItems,
    showQRPreview,
    paymentMethod,
    cancelDraftByOrderCode,
    resetQRState,
  ]);

  // Cleanup on unmount
  React.useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      const orderCodeToCancel = currentOrderCodeRef.current;
      if (orderCodeToCancel) {
        receiptService.cancelQRPreview(orderCodeToCancel).catch(() => {});
      }
    };
  }, []);

  return {
    draftData,
    isCreatingDraft,
    isConfirmingDraft,
    showQRPreview,
    remainingTime,
    isExpired,
    completedReceipt,
    showSuccessDialog,
    successType,
    createDraft,
    confirmDraft,
    cancelDraft,
    resetAfterSuccess,
    closeSuccessDialog,
    handleWebhookPaymentSuccess,
  };
}
