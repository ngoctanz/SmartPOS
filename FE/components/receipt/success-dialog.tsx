"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Printer, Banknote, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { Receipt } from "@/service/receipt.service";
import { useHotkey } from "@/hooks/useHotkey";

type SuccessType = "manual" | "paid" | "cash";

interface SuccessDialogProps {
  open: boolean;
  receipt: Receipt | null;
  onPrint: () => void;
  onOk: () => void;
  type?: SuccessType;
}

export function SuccessDialog({
  open,
  receipt,
  onPrint,
  onOk,
  type = "manual",
}: SuccessDialogProps) {
  const isCash = type === "cash";
  const isTransfer = !isCash;
  const isCompleted = type === "paid" || type === "cash";

  // Phím P: In bill - chỉ cho Transfer (Cash dùng Enter)
  useHotkey({
    key: "p",
    onPress: onPrint,
    enabled: open && !!receipt && isTransfer,
  });
  useHotkey({
    key: "P",
    onPress: onPrint,
    enabled: open && !!receipt && isTransfer,
  });

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle
            className={`flex items-center justify-center gap-2 ${
              isCompleted ? "text-green-600" : "text-blue-600"
            }`}
          >
            {isCash ? (
              <>
                <Wallet className="h-6 w-6 flex-shrink-0" />
                <span>Thanh toán tiền mặt thành công!</span>
              </>
            ) : type === "paid" ? (
              <>
                <Banknote className="h-6 w-6 flex-shrink-0" />
                <span>Thanh toán chuyển khoản thành công!</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
                <span>Hoàn thành đơn hàng</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isCompleted ? (
              <>
                Đơn hàng <span className="font-semibold">{receipt.code}</span>{" "}
                đã được thanh toán thành công!
              </>
            ) : (
              <>
                Đơn hàng <span className="font-semibold">{receipt.code}</span>{" "}
                đang chờ khách hàng thanh toán
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mã hóa đơn:</span>
            <span className="font-medium">{receipt.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số sản phẩm:</span>
            <span>{receipt.listProduct.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng tiền:</span>
            <span className="font-bold text-primary">
              {formatCurrency(receipt.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trạng thái:</span>
            {isCompleted ? (
              <span className="text-green-600 font-medium">Đã thanh toán</span>
            ) : (
              <span className="text-yellow-600 font-medium">
                Chờ thanh toán
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {isCash ? "In bill (Enter)" : "In bill (P)"}
            </span>
          </Button>
          <Button className="flex-1" onClick={onOk}>
            OK (Enter)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
