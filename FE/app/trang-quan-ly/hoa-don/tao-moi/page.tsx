"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import receiptService, {
  CreateReceiptRequest,
} from "@/service/receipt.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";
import {
  CartItemsTable,
  PaymentSummary,
  SuccessDialog,
} from "@/components/receipt";
import { SmartProductInput } from "@/components/common/smart-product-input";
import { PrintQueueStatus } from "@/components/printer";
import { useSocket } from "@/hooks/useSocket";
import { useQRDraft } from "@/hooks/useQRDraft";
import { useCart } from "@/hooks/useCart";
import { useBranches } from "@/hooks/useBranches";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useErrorReceiptLoader } from "@/hooks/useErrorReceiptLoader";
import { useEnterFlow } from "@/hooks/useEnterFlow";
import { useReceiptPrint } from "@/hooks/useReceiptPrint";
import { optimisticPrint, instantPrintReceipt } from "@/utils/optimistic-print";
import { playSuccessSound, speakPaymentSuccess } from "@/utils/audio";

export default function CreateReceiptPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";
  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  // === Cart Hook ===
  const {
    cartItems,
    setCartItems,
    addProduct,
    updateQuantity,
    removeItem,
    clearCart,
    totalAmount,
  } = useCart();

  // === Branches Hook ===
  const { branches, selectedBranch, setSelectedBranch, currentBranch } =
    useBranches({ defaultBranchId: user?.branchId, loadAllOnMount: isAdmin });

  // === Product Search Hook ===
  const { searchProducts, getProductByBarcode } = useProductSearch({
    branchId: selectedBranch,
    isAdmin,
  });

  // === Receipt Print Hook (for draft printing and queue status) ===
  const {
    printDraftWithQR,
    isProcessing: isPrintProcessing,
    pendingJobsCount,
    currentJob,
  } = useReceiptPrint({
    userId: user?._id,
    onPrintSuccess: (receiptCode) => {
      console.log(`[Print] Successfully printed receipt: ${receiptCode}`);
    },
    onPrintError: (receiptCode, error) => {
      console.error(`[Print] Failed to print receipt ${receiptCode}:`, error);
      toast.error(`Lỗi in hóa đơn: ${receiptCode}`);
    },
  });

  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "transfer">(
    "cash",
  );
  const [customerPaid, setCustomerPaid] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // === Load from error receipt ===
  useErrorReceiptLoader({ setCartItems, setPaymentMethod });

  // === QR Draft Hook ===
  const {
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
    handleWebhookPaymentSuccess,
  } = useQRDraft({
    cartItems,
    branchId: selectedBranch,
    isAdmin,
    paymentMethod,
    // Callback khi confirm thành công (bấm Hoàn thành) → reset cart luôn
    onPaymentSuccess: () => {
      clearCart();
      setPaymentMethod("cash");
      setCustomerPaid(null);
    },
  });

  // === Refs for socket callback (avoid stale closure) ===
  const showQRPreviewRef = React.useRef(showQRPreview);
  const draftDataRef = React.useRef(draftData);
  React.useEffect(() => {
    showQRPreviewRef.current = showQRPreview;
    draftDataRef.current = draftData;
  }, [showQRPreview, draftData]);

  // === Socket: Real-time payment notifications ===
  useSocket({
    onPaymentSuccess: async (data) => {
      const currentShowQR = showQRPreviewRef.current;
      const currentDraft = draftDataRef.current;

      // Play success sound and speak amount for ANY payment (Current or Background)
      playSuccessSound();
      speakPaymentSuccess(data.amount);

      if (currentShowQR && currentDraft?.receiptCode === data.receiptCode) {
        // ... Modal handling
        try {
          const response = await receiptService.getByCode(data.receiptCode);
          if (response.success && response.data) {
            handleWebhookPaymentSuccess(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch receipt after payment:", error);
          cancelDraft();
          router.push(`/trang-quan-ly/hoa-don/${data.receiptCode}`);
        }
      } else {
        // Nếu nhận được socket của đơn khác (ví dụ đơn cũ delay mới thanh toán)
        // Chỉ hiện thông báo nhỏ (Silent Toast) để NV biết
        toast.success(`Thanh toán thành công: ${data.receiptCode}`, {
          description: `Đã nhận: ${data.amount.toLocaleString("vi-VN")} đ`,
          duration: 5000,
          action: {
            label: "Xem",
            onClick: () =>
              router.push(`/trang-quan-ly/hoa-don/${data.receiptCode}`),
          },
        });
      }
    },
    enabled: true,
  });

  // === SAFE OPTIMISTIC PRINT: Pre-render NGAY, CHỞ API xong mới trigger print ===
  const createCashReceipt = React.useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Pre-render HTML ngay, chờ API xong mới trigger print
    const { triggerPrint, cancel } = optimisticPrint({
      cartItems,
      totalAmount,
      paymentMethod: "cash",
      branchName: currentBranch?.branchName,
      branchAddress: currentBranch?.address,
      customerPaid: customerPaid ?? undefined,
    });

    try {
      const receiptData: CreateReceiptRequest = {
        ...(isAdmin && { branchId: selectedBranch }),
        listProduct: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          salePrice: item.salePrice,
        })),
        totalAmount,
        paymentMethod: "cash",
        ...(customerPaid && { customerPaid }),
      };

      const response = await receiptService.create(receiptData);

      if (response.success && response.data) {
        const receipt = response.data;

        // API thành công - trigger print với mã thật
        triggerPrint(receipt.code);

        playSuccessSound();

        if (showQRPreview) cancelDraft();

        setTimeout(() => {
          toast.success("Tạo hóa đơn thành công!", {
            description: `Mã hóa đơn: ${receipt.code}`,
          });
        }, 500);

        clearCart();
        setCustomerPaid(null);

        // Auto focus lại input để quét đơn tiếp
        setTimeout(() => {
          const hasOpenDialog = document.querySelector('[role="dialog"]');
          if (!hasOpenDialog) {
            barcodeInputRef.current?.focus();
          }
        }, 200);
      } else {
        cancel();
        toast.error(response.message || "Tạo hóa đơn thất bại");
      }
    } catch (error) {
      cancel();
      toast.error((error as Error).message || "Lỗi tạo hóa đơn");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    cartItems,
    isAdmin,
    selectedBranch,
    totalAmount,
    customerPaid,
    showQRPreview,
    cancelDraft,
    clearCart,
    currentBranch,
  ]);

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting || isCreatingDraft || isConfirmingDraft) {
      console.warn("⚠️ Duplicate submit blocked");
      return;
    }

    if (isAdmin && !selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào giỏ hàng");
      return;
    }

    if (paymentMethod === "transfer") {
      if (showQRPreview) return;
      await createDraft();
      return;
    }

    await createCashReceipt();
  }, [
    isSubmitting,
    isCreatingDraft,
    isConfirmingDraft,
    isAdmin,
    selectedBranch,
    cartItems.length,
    paymentMethod,
    showQRPreview,
    createDraft,
    createCashReceipt,
  ]);

  // === Payment method change handler ===
  // Không hủy draft khi chuyển tab - user có thể quay lại
  // Draft chỉ bị hủy khi: tạo đơn tiền mặt thành công, bấm Hủy, hoặc hết hạn
  // === Payment method change handler ===
  const handlePaymentMethodChange = React.useCallback(
    (method: "cash" | "transfer") => {
      setPaymentMethod(method);
    },
    [],
  );

  // === Success dialog handler (Transfer payment) ===
  const handleSuccessDialogOk = React.useCallback(() => {
    resetAfterSuccess();
    clearCart();
    setPaymentMethod("cash");
    setCustomerPaid(null);
    
    // Auto focus input để sẵn sàng cho đơn tiếp theo
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }, [resetAfterSuccess, clearCart]);

  // === Print draft receipt handler ===
  const handlePrintDraftReceipt = React.useCallback(() => {
    // Validation: Đảm bảo draft data đã sẵn sàng
    if (!draftData?.receiptCode) {
      console.warn("[Print] Draft data not ready");
      toast.error("Mã hóa đơn chưa sẵn sàng, vui lòng thử lại");
      return;
    }

    // In hóa đơn draft với QR code
    printDraftWithQR({
      code: draftData.receiptCode,
      cartItems,
      totalAmount,
      branchName: currentBranch?.branchName,
      branchAddress: currentBranch?.address,
      staffName: user?.name || user?.userName,
      qrCode: draftData.paymentInfo?.qrCode,
      accountName: draftData.paymentInfo?.accountName,
      accountNumber: draftData.paymentInfo?.accountNumber,
      description: draftData.paymentInfo?.description,
    });
  }, [
    draftData,
    cartItems,
    totalAmount,
    currentBranch,
    user,
    printDraftWithQR,
  ]);

  // === Enter Flow Hook ===
  useEnterFlow({
    paymentMethod,
    canSubmit:
      cartItems.length > 0 &&
      !isSubmitting &&
      !isCreatingDraft &&
      !isConfirmingDraft &&
      !(paymentMethod === "transfer" && showQRPreview) &&
      (isAdmin ? !!selectedBranch : true),
    showQRPreview,
    showTransferSuccessDialog: showSuccessDialog,
    onSubmit: handleSubmit,
    onPrintDraft: handlePrintDraftReceipt,
    onConfirmQR: confirmDraft,
    onCloseTransferSuccess: handleSuccessDialogOk,
    // Chỉ cho phép in khi draft data đã có đầy đủ
    canPrintDraft: !!draftData?.receiptCode,
  });

  // === Render ===
  return (
    <div className="flex flex-col h-full p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.INVOICES)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Tạo hóa đơn mới</h1>
          <p className="text-sm text-muted-foreground">
            Quét barcode hoặc tìm kiếm sản phẩm để thêm vào giỏ hàng
          </p>
        </div>
        {/* Print Queue Status Indicator */}
        <PrintQueueStatus
          isProcessing={isPrintProcessing}
          pendingCount={pendingJobsCount}
          currentReceiptCode={currentJob?.receiptCode}
          compact
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Section */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <SmartProductInput
              onProductSelect={addProduct}
              searchFn={searchProducts}
              getByBarcodeFn={getProductByBarcode}
              placeholder="Quét mã barcode hoặc nhập tên sản phẩm..."
              autoFocus
              inputRef={barcodeInputRef}
            />
          </div>

          {/* Cart Table */}
          <CartItemsTable
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onClearAll={clearCart}
          />
        </div>

        {/* Right Panel - Payment Summary */}
        <div className="lg:w-96 lg:shrink-0">
          <PaymentSummary
            items={cartItems}
            branches={branches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={handlePaymentMethodChange}
            isAdmin={isAdmin}
            onSubmit={handleSubmit}
            disabled={cartItems.length === 0 || !selectedBranch}
            isSubmitting={isSubmitting}
            isCreatingPreview={isCreatingDraft}
            customerPaid={customerPaid}
            onCustomerPaidChange={setCustomerPaid}
            // QR Inline props
            qrPaymentInfo={
              draftData?.paymentInfo
                ? {
                    orderCode: draftData.orderCode,
                    qrCode: draftData.paymentInfo.qrCode,
                    checkoutUrl: draftData.paymentInfo.checkoutUrl,
                    accountNumber: draftData.paymentInfo.accountNumber,
                    accountName: draftData.paymentInfo.accountName,
                    bin: draftData.paymentInfo.bin,
                    amount:
                      draftData.paymentInfo.amount || draftData.totalAmount,
                    description: draftData.paymentInfo.description,
                    status: draftData.paymentInfo.status,
                  }
                : null
            }
            receiptCode={draftData?.receiptCode}
            qrRemainingTime={remainingTime}
            isQRExpired={isExpired}
            showQRPreview={showQRPreview}
            onBackFromQR={cancelDraft}
            onConfirmQR={confirmDraft}
            isConfirmingQR={isConfirmingDraft}
            onPrintReceipt={handlePrintDraftReceipt}
          />
        </div>
      </div>

      <SuccessDialog
        open={showSuccessDialog}
        receipt={completedReceipt}
        type={successType}
        onPrint={() => {
          if (completedReceipt) instantPrintReceipt(completedReceipt);
        }}
        onOk={handleSuccessDialogOk}
      />
    </div>
  );
}
