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
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { Receipt } from "@/service/receipt.service";
import { formatCurrency } from "@/utils/format.utils";

interface MarkErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
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

  React.useEffect(() => {
    if (!open) setErrorReason("");
  }, [open]);

  if (!receipt) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Đánh dấu hóa đơn lỗi
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>
                Đánh dấu <strong className="text-foreground">{receipt.code}</strong> là lỗi?
              </p>

              <div className="bg-muted p-3 rounded-lg text-sm">
                <div className="flex justify-between font-medium">
                  <span>{receipt.listProduct.length} sản phẩm</span>
                  <span>{formatCurrency(receipt.totalAmount)}</span>
                </div>
              </div>

              <div className="flex gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p>• Sản phẩm sẽ được hoàn về kho</p>
                  <p>• Không tính vào doanh thu</p>
                  <p>• Có thể tạo lại hóa đơn mới</p>
                </div>
              </div>

              <Textarea
                placeholder="Lý do (không bắt buộc)"
                value={errorReason}
                onChange={(e) => setErrorReason(e.target.value)}
                maxLength={500}
                rows={2}
                disabled={isSubmitting}
                className="resize-none"
              />

              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Hành động này không thể hoàn tác
              </p>
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
            Xác nhận
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
