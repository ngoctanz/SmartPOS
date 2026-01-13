"use client";

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
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { CartItem } from "./cart-items-table";
import { formatCurrency } from "@/utils/format.utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  paymentMethod: "cash" | "card" | "transfer";
  onConfirm: () => void;
  isSubmitting: boolean;
}

const paymentMethodLabels = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  items,
  paymentMethod,
  onConfirm,
  isSubmitting,
}: ConfirmDialogProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] flex flex-col">
        <AlertDialogHeader className="flex-shrink-0">
          <AlertDialogTitle>Xác nhận thanh toán</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span>Số sản phẩm:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tổng số lượng:</span>
                <span className="font-medium">{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Phương thức:</span>
                <Badge variant="outline">{paymentMethodLabels[paymentMethod]}</Badge>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Tổng tiền:</span>
                <span className="font-bold text-lg text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-shrink-0">
          <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Xác nhận"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
