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
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { ImportItem } from "./import-items-table";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ImportItem[];
  supplierName: string;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  items,
  supplierName,
  onConfirm,
  isSubmitting,
}: ConfirmDialogProps) {
  const totalAmount = items.reduce(
    (sum, item) => sum + item.importPrice * item.quantity,
    0
  );
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Enter hotkey to confirm
  React.useEffect(() => {
    if (!open || isSubmitting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isSubmitting, onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận tạo phiếu nhập</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Số sản phẩm:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng số lượng:</span>
                  <span className="font-medium">{totalQuantity}</span>
                </div>
                {supplierName && (
                  <div className="flex justify-between">
                    <span>Nhà cung cấp:</span>
                    <span className="font-medium">{supplierName}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Tổng tiền:</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Phiếu nhập sẽ ở trạng thái &quot;Chờ xử lý&quot;. Bạn cần xác nhận phiếu để cập nhật tồn kho.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Hủy (Esc)</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Xác nhận (Enter)"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
