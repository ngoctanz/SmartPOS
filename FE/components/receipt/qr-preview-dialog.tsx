"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/utils/format.utils";
import { QRPreviewResponse } from "@/service/receipt.service";

interface QRPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: QRPreviewResponse | null;
  onBack: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
  itemCount: number;
  totalQuantity: number;
}

export function QRPreviewDialog({
  open,
  previewData,
  onBack,
  onConfirm,
  isConfirming,
  itemCount,
  totalQuantity,
}: QRPreviewDialogProps) {
  // All hooks must be called before any early returns
  const [remainingTime, setRemainingTime] = React.useState<string>("");

  // Handle Enter key to confirm, Esc to go back
  React.useEffect(() => {
    if (!open || !previewData || isConfirming) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && remainingTime !== "Đã hết hạn") {
        e.preventDefault();
        onConfirm();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, previewData, isConfirming, onConfirm, onBack, remainingTime]);

  // Calculate remaining time and auto-back when expired
  React.useEffect(() => {
    if (!previewData?.expiresAt) {
      setRemainingTime("");
      return;
    }

    const updateTime = () => {
      const now = new Date().getTime();
      const expiry = new Date(previewData.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setRemainingTime("Đã hết hạn");
        // Auto back when expired (after 2 seconds to show message)
        setTimeout(() => {
          if (!isConfirming) {
            onBack();
          }
        }, 2000);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [previewData?.expiresAt, isConfirming, onBack]);

  // Early return after all hooks
  if (!previewData) return null;

  const { paymentInfo, totalAmount } = previewData;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            Thanh toán chuyển khoản
          </DialogTitle>
          <DialogDescription className="text-center">
            Khách hàng quét mã để thanh toán. Bấm &quot;Hoàn thành&quot; để lưu hóa đơn vào danh sách chờ.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* QR Code */}
          {paymentInfo?.qrCode ? (
            <div className="p-3 bg-white rounded-xl border-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paymentInfo.qrCode}
                alt="QR Thanh toán"
                className="w-56 h-56 object-contain"
                onError={(e) => {
                  const info = paymentInfo;
                  if (info?.bin && info?.accountNumber && info?.amount) {
                    (e.target as HTMLImageElement).src = 
                      `https://img.vietqr.io/image/${info.bin}-${info.accountNumber}-compact2.png?amount=${info.amount}&addInfo=${encodeURIComponent(info.description || "")}&accountName=${encodeURIComponent(info.accountName || "")}`;
                  }
                }}
              />
            </div>
          ) : paymentInfo?.bin && paymentInfo?.accountNumber ? (
            <div className="p-3 bg-white rounded-xl border-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.vietqr.io/image/${paymentInfo.bin}-${paymentInfo.accountNumber}-compact2.png?amount=${paymentInfo.amount || totalAmount}&addInfo=${encodeURIComponent(paymentInfo.description || "")}&accountName=${encodeURIComponent(paymentInfo.accountName || "")}`}
                alt="QR Thanh toán"
                className="w-56 h-56 object-contain"
              />
            </div>
          ) : (
            <div className="p-4 bg-white rounded-lg border">
              <QRCodeSVG
                value={paymentInfo?.checkoutUrl || ""}
                size={220}
                level="H"
              />
            </div>
          )}

          {/* Bank info */}
          {paymentInfo?.accountNumber && (
            <div className="w-full p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngân hàng:</span>
                <span className="font-medium">{paymentInfo.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số TK:</span>
                <span className="font-mono font-medium">{paymentInfo.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nội dung:</span>
                <span className="font-medium">{paymentInfo.description}</span>
              </div>
            </div>
          )}

          {/* Order summary */}
          <div className="text-center space-y-2 w-full">
            <div className="flex justify-between text-sm px-2">
              <span className="text-muted-foreground">Số sản phẩm:</span>
              <span>{itemCount} ({totalQuantity} items)</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalAmount)}
            </p>
            {remainingTime && (
              <p className="text-sm text-muted-foreground">
                Mã QR hết hạn sau: <span className="font-medium">{remainingTime}</span>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onBack}
              disabled={isConfirming}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={isConfirming || remainingTime === "Đã hết hạn"}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : remainingTime === "Đã hết hạn" ? (
                "Mã QR đã hết hạn"
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Hoàn thành (Enter)
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Nhấn <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> để quay lại
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
