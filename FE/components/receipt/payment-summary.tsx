"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Banknote,
  Building2,
  ShoppingCart,
  Check,
  X,
  Loader2,
  Printer,
} from "lucide-react";
import { CartItem } from "./cart-items-table";
import { Branch } from "@/service/branch.service";
import { formatCurrency } from "@/utils/format.utils";
import { CashPaymentInput } from "./cash-payment-input";
import { QRInlineDisplay, QRPaymentInfo } from "./qr-inline-display";

interface PaymentSummaryProps {
  items: CartItem[];
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  paymentMethod: "cash" | "transfer";
  onPaymentMethodChange: (method: "cash" | "transfer") => void;
  isAdmin: boolean;
  onSubmit: () => void;
  disabled: boolean;
  isSubmitting?: boolean;
  isCreatingPreview?: boolean;
  customerPaid: number | null;
  onCustomerPaidChange: (amount: number | null) => void;
  // QR Inline props
  qrPaymentInfo?: QRPaymentInfo | null;
  receiptCode?: string;
  qrRemainingTime?: string;
  isQRExpired?: boolean;
  onRefreshQR?: () => void;
  isRefreshingQR?: boolean;
  showQRPreview?: boolean;
  onBackFromQR?: () => void;
  onConfirmQR?: () => void;
  isConfirmingQR?: boolean;
  onPrintReceipt?: () => void;
}

export function PaymentSummary({
  items,
  branches,
  selectedBranch,
  onBranchChange,
  paymentMethod,
  onPaymentMethodChange,
  isAdmin,
  onSubmit,
  disabled,
  isSubmitting = false,
  isCreatingPreview = false,
  customerPaid,
  onCustomerPaidChange,
  // QR Inline props
  qrPaymentInfo,
  receiptCode,
  qrRemainingTime,
  isQRExpired = false,
  onRefreshQR,
  isRefreshingQR = false,
  showQRPreview = false,
  onBackFromQR,
  onConfirmQR,
  isConfirmingQR = false,
  onPrintReceipt,
}: PaymentSummaryProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0
  );

  // Enter được quản lý bởi useEnterFlow ở page level

  return (
    <div className="flex flex-col gap-4 h-fit lg:sticky lg:top-4">
      {/* Branch Selection - Admin only */}
      {isAdmin && (
        <div className="bg-muted/50 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Chi nhánh</Label>
          <Select value={selectedBranch} onValueChange={onBranchChange}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch._id} value={branch._id}>
                  {branch.branchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-muted/50 rounded-lg p-4">
        <Label className="text-sm font-medium mb-2 block">Thanh toán</Label>
        <div className="flex gap-2">
          <Button
            variant={paymentMethod === "cash" ? "default" : "outline"}
            className="flex-1 h-10"
            onClick={() => {
              if (paymentMethod !== "cash") {
                onPaymentMethodChange("cash");
              }
            }}
            disabled={isConfirmingQR}
          >
            <Banknote className="h-4 w-4 mr-2" />
            Tiền mặt
          </Button>
          <Button
            variant={paymentMethod === "transfer" ? "default" : "outline"}
            className="flex-1 h-10"
            onClick={() => {
              if (paymentMethod !== "transfer") {
                onPaymentMethodChange("transfer");
                onCustomerPaidChange(null);
              }
            }}
            disabled={true}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Chuyển khoản (Tạm khóa)
          </Button>
        </div>

        {paymentMethod === "cash" && totalAmount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <CashPaymentInput
              totalAmount={totalAmount}
              customerPaid={customerPaid}
              onCustomerPaidChange={onCustomerPaidChange}
              onEnterPress={onSubmit}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 flex-1">
        <Label className="text-sm font-medium mb-3 block">Tổng cộng</Label>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số sản phẩm:</span>
            <span>{items.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng số lượng:</span>
            <span>{totalQuantity}</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Tổng tiền:</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Inline Display - hiện khi chọn chuyển khoản và có QR data */}
      {paymentMethod === "transfer" && showQRPreview && qrPaymentInfo && (
        <QRInlineDisplay
          paymentInfo={qrPaymentInfo}
          totalAmount={totalAmount}
          receiptCode={receiptCode}
          remainingTime={qrRemainingTime}
          isExpired={isQRExpired}
          onRefresh={onRefreshQR}
          isRefreshing={isRefreshingQR}
        />
      )}

      {/* Submit Button - thay đổi theo trạng thái QR preview (chỉ khi đang ở tab chuyển khoản) */}
      {paymentMethod === "transfer" && showQRPreview && qrPaymentInfo ? (
        <div className="flex flex-col gap-2">
          {/* Nút In hóa đơn */}
          {onPrintReceipt && (
            <Button
              variant="outline"
              className="h-12 w-full"
              onClick={onPrintReceipt}
              disabled={isConfirmingQR}
            >
              <Printer className="h-5 w-5 mr-2" />
              In hóa đơn - có mã QR (Enter)
            </Button>
          )}

          {/* Nút Hủy + Hoàn thành */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-14 text-destructive hover:text-destructive"
              onClick={onBackFromQR}
              disabled={isConfirmingQR}
            >
              <X className="h-5 w-5 mr-2" />
              Hủy đơn
            </Button>
            <Button
              className="flex-1 h-14 text-lg font-bold"
              onClick={onConfirmQR}
              disabled={isConfirmingQR || isQRExpired}
            >
              {isConfirmingQR ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : isQRExpired ? (
                "Mã QR đã hết hạn"
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Hoàn thành (O)
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="h-14 text-lg font-bold"
          disabled={disabled || isSubmitting || isCreatingPreview}
          onClick={onSubmit}
        >
          {isSubmitting ? (
            <span className="animate-pulse">Đang xử lý...</span>
          ) : isCreatingPreview ? (
            <span className="animate-pulse">Đang tạo mã QR...</span>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 mr-2" />
              THANH TOÁN (Enter)
            </>
          )}
        </Button>
      )}
    </div>
  );
}
