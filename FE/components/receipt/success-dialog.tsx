"use client";

import * as React from "react";
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

type SuccessType = "manual" | "paid" | "cash";

interface SuccessDialogProps {
  open: boolean;
  receipt: Receipt | null;
  onPrint: () => void;
  onOk: () => void;
  /**
   * "manual" = bấm Hoàn thành thủ công (chuyển khoản) → pending
   * "paid" = webhook báo đã thanh toán (chuyển khoản) → completed
   * "cash" = thanh toán tiền mặt → completed
   */
  type?: SuccessType;
}

export function SuccessDialog({
  open,
  receipt,
  onPrint,
  onOk,
  type = "manual",
}: SuccessDialogProps) {
  const handlePrint = () => {
    // Chỉ gọi callback - để parent component quyết định in gì
    // Tránh duplicate print khi parent đã handle trong onPrint
    onPrint();
  };

  if (!receipt) return null;

  const isPaid = type === "paid";
  const isCash = type === "cash";
  const isCompleted = isPaid || isCash; // Cả 2 đều là đã thanh toán xong

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle
              className={`flex items-center justify-center gap-2 ${
                isCompleted ? "text-green-600" : "text-blue-600"
              }`}
            >
              {isCash ? (
                <>
                  <Wallet className="h-6 w-6" />
                  Thanh toán tiền mặt thành công!
                </>
              ) : isPaid ? (
                <>
                  <Banknote className="h-6 w-6" />
                  Thanh toán chuyển khoản thành công!
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6" />
                  Hoàn thành đơn hàng
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

          {/* Thông tin đơn hàng */}
          <div className="py-4 space-y-2 text-sm">
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
                <span className="text-green-600 font-medium">
                  Đã thanh toán
                </span>
              ) : (
                <span className="text-yellow-600 font-medium">
                  Chờ thanh toán
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              In bill
            </Button>
            <Button className="flex-1" onClick={onOk}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
