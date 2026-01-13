"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import receiptService, {
  CreateReceiptRequest,
  Receipt,
} from "@/service/receipt.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";
import {
  CartItemsTable,
  PaymentSummary,
  SuccessDialog,
  CashPaymentDialog,
} from "@/components/receipt";
import { SmartProductInput } from "@/components/common/smart-product-input";
import { useSocket } from "@/hooks/useSocket";
import { useQRDraft } from "@/hooks/useQRDraft";
import { useCart } from "@/hooks/useCart";
import { useBranches } from "@/hooks/useBranches";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useErrorReceiptLoader } from "@/hooks/useErrorReceiptLoader";
import { useEnterFlow } from "@/hooks/useEnterFlow";
import { printDraftWithQR, printReceipt } from "@/utils/print-direct";
import { playSuccessSound, speakPaymentSuccess } from "@/utils/audio";

export default function CreateReceiptPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";

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

  // === Payment State ===
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "transfer">(
    "cash"
  );
  const [customerPaid, setCustomerPaid] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // === Cash Payment Dialog State ===
  const [showCashDialog, setShowCashDialog] = React.useState(false);
  const [cashSuccessReceipt, setCashSuccessReceipt] =
    React.useState<Receipt | null>(null);
  const [showCashSuccessDialog, setShowCashSuccessDialog] =
    React.useState(false);

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

  // === Create cash receipt (called from dialog confirm) ===
  const confirmCashPayment = React.useCallback(async () => {
    setIsSubmitting(true);
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
        playSuccessSound();

        // Hủy QR draft nếu đang có (user chuyển từ CK sang tiền mặt)
        if (showQRPreview) cancelDraft();

        setShowCashDialog(false);
        setCashSuccessReceipt(response.data);
        setShowCashSuccessDialog(true);
      } else {
        toast.error(response.message || "Tạo hóa đơn thất bại");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi tạo hóa đơn");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    cartItems,
    isAdmin,
    selectedBranch,
    totalAmount,
    customerPaid,
    showQRPreview,
    cancelDraft,
  ]);

  // === Cash success dialog OK handler ===
  const handleCashSuccessOk = React.useCallback(() => {
    setShowCashSuccessDialog(false);
    setCashSuccessReceipt(null);
    setCustomerPaid(null);
    // Reset cart để sẵn sàng cho đơn mới
    clearCart();
    // Reset payment method về mặc định (đảm bảo clean state)
    setPaymentMethod("cash");
  }, [clearCart]);

  // === Submit handler ===
  const handleSubmit = React.useCallback(async () => {
    if (isAdmin && !selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào giỏ hàng");
      return;
    }

    if (paymentMethod === "transfer") {
      // Nếu đang có QR preview thì không tạo mới (user phải hủy hoặc hoàn thành trước)
      if (showQRPreview) return;
      await createDraft();
      return;
    }

    // Cash payment → show confirmation dialog
    setShowCashDialog(true);
  }, [
    isAdmin,
    selectedBranch,
    cartItems.length,
    paymentMethod,
    showQRPreview,
    createDraft,
  ]);

  // === Payment method change handler ===
  // Không hủy draft khi chuyển tab - user có thể quay lại
  // Draft chỉ bị hủy khi: tạo đơn tiền mặt thành công, bấm Hủy, hoặc hết hạn
  const handlePaymentMethodChange = React.useCallback(
    (method: "cash" | "transfer") => {
      setPaymentMethod(method);
    },
    []
  );

  // === Success dialog handler (Transfer payment) ===
  const handleSuccessDialogOk = React.useCallback(() => {
    resetAfterSuccess();
    // Reset tất cả state để sẵn sàng cho đơn mới
    clearCart();
    setPaymentMethod("cash");
    setCustomerPaid(null);
  }, [resetAfterSuccess, clearCart]);

  // === Print handler (direct browser print dialog) ===
  const handlePrintDraftReceipt = React.useCallback(() => {
    if (!draftData) return;
    printDraftWithQR({
      code: draftData.receiptCode,
      cartItems,
      totalAmount,
      paymentMethod: "transfer",
      branchName: currentBranch?.branchName,
      branchAddress: currentBranch?.address,
      staffName: user?.name || user?.userName,
      qrCode: draftData.paymentInfo?.qrCode,
    });
  }, [draftData, cartItems, totalAmount, currentBranch, user]);

  const handlePrintCashReceipt = React.useCallback(() => {
    if (cashSuccessReceipt) printReceipt(cashSuccessReceipt);
  }, [cashSuccessReceipt]);

  // === Enter Flow Hook ===
  useEnterFlow({
    paymentMethod,
    canSubmit:
      cartItems.length > 0 &&
      !isSubmitting &&
      !isCreatingDraft &&
      !isConfirmingDraft &&
      !(paymentMethod === "transfer" && showQRPreview) &&
      !showCashDialog &&
      (isAdmin ? !!selectedBranch : true),
    showCashDialog,
    showCashSuccessDialog,
    showQRPreview,
    showTransferSuccessDialog: showSuccessDialog,
    onSubmit: handleSubmit,
    onConfirmCash: confirmCashPayment,
    onPrintCashReceipt: handlePrintCashReceipt,
    onCloseCashSuccess: handleCashSuccessOk,
    onPrintDraft: handlePrintDraftReceipt,
    onConfirmQR: confirmDraft,
    onCloseTransferSuccess: handleSuccessDialogOk,
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
        <div>
          <h1 className="text-xl font-semibold">Tạo hóa đơn mới</h1>
          <p className="text-sm text-muted-foreground">
            Quét barcode hoặc tìm kiếm sản phẩm để thêm vào giỏ hàng
          </p>
        </div>
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
          if (completedReceipt) printReceipt(completedReceipt);
        }}
        onOk={handleSuccessDialogOk}
      />

      <CashPaymentDialog
        open={showCashDialog}
        onClose={() => setShowCashDialog(false)}
        onConfirm={confirmCashPayment}
        cartItems={cartItems}
        totalAmount={totalAmount}
        customerPaid={customerPaid}
        branchName={currentBranch?.branchName}
        staffName={user?.name || user?.userName}
        isConfirming={isSubmitting}
      />

      <SuccessDialog
        open={showCashSuccessDialog}
        receipt={cashSuccessReceipt}
        type="cash"
        onPrint={() => {
          if (cashSuccessReceipt) printReceipt(cashSuccessReceipt);
        }}
        onOk={handleCashSuccessOk}
      />
    </div>
  );
}
