"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { Receipt } from "@/service/receipt.service";
import { formatCurrency } from "@/utils/format.utils";

interface MarkErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt;
  onConfirm: (errorReason?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function MarkErrorDialog({
  open,
  onOpenChange,
  receipt,
  onConfirm,
  isSubmitting = false,
}: MarkErrorDialogProps) {
  const [errorReason, setErrorReason] = React.useState("");

  const handleConfirm = async () => {
    await onConfirm(errorReason.trim() || undefined);
  };

  // Reset reason when dialog closes
  React.useEffect(() => {
    if (!open) {
      setErrorReason("");
    }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Đánh dấu hóa đơn lỗi?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-base">
                Bạn có chắc chắn muốn đánh dấu hóa đơn{" "}
                <strong className="text-foreground">{receipt.code}</strong> là
                lỗi?
              </p>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Điều gì sẽ xảy ra:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    <li>Hóa đơn sẽ được đánh dấu là lỗi</li>
                    <li>Sản phẩm sẽ được hoàn về kho tự động</li>
                    <li>Hóa đơn không được tính vào doanh thu</li>
                    <li>Bạn có thể tạo lại hóa đơn mới sau đó</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">
                  Sản phẩm sẽ được hoàn về kho:
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {receipt.listProduct.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm py-1"
                    >
                      <span>
                        • {item.productName} x {item.quantity}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.salePrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>Tổng cộng:</span>
                  <span>{formatCurrency(receipt.totalAmount)}</span>
                </div>
              </div>

              {/* Error Reason Input */}
              <div className="space-y-2">
                <Label htmlFor="errorReason" className="text-sm font-medium">
                  Lý do đánh dấu lỗi (không bắt buộc)
                </Label>
                <Textarea
                  id="errorReason"
                  placeholder="Ví dụ: Nhập sai sản phẩm, sai số lượng, khách hàng hủy..."
                  value={errorReason}
                  onChange={(e) => setErrorReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={isSubmitting}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {errorReason.length}/500 ký tự
                </p>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Lưu ý:</strong> Hành động này không thể hoàn tác. Hãy
                  chắc chắn trước khi tiếp tục.
                </AlertDescription>
              </Alert>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận đánh dấu lỗi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
