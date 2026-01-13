"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { CartItem } from "./cart-items-table";
import { formatCurrency } from "@/utils/format.utils";

interface CashPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  cartItems: CartItem[];
  totalAmount: number;
  customerPaid: number | null;
  branchName?: string;
  staffName?: string;
  isConfirming: boolean;
}

export function CashPaymentDialog({
  open,
  onClose,
  onConfirm,
  cartItems,
  totalAmount,
  customerPaid,
  branchName,
  isConfirming,
}: CashPaymentDialogProps) {
  const changeAmount = customerPaid ? customerPaid - totalAmount : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center text-xl">
            Xác nhận thanh toán tiền mặt
          </DialogTitle>
        </DialogHeader>

        {/* Nội dung có thể scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-4">
          {/* Danh sách sản phẩm - giới hạn chiều cao */}
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {cartItems.map((item, index) => (
              <div
                key={item.productId}
                className="flex justify-between text-sm gap-2"
              >
                <span className="flex-1 min-w-0 truncate">
                  {index + 1}. {item.productName}
                </span>
                <span className="text-muted-foreground flex-shrink-0">
                  x{item.quantity}
                </span>
                <span className="font-medium flex-shrink-0 min-w-16 text-right">
                  {formatCurrency(item.salePrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Tổng tiền */}
          <div className="space-y-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Tổng cộng:</span>
              <span className="text-primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            {customerPaid && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Khách đưa:</span>
                  <span>{formatCurrency(customerPaid)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Tiền thừa:</span>
                  <span className="text-green-600">
                    {formatCurrency(changeAmount > 0 ? changeAmount : 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          {branchName && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground text-center">
                Chi nhánh: {branchName}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isConfirming}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Xác nhận (Enter)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
