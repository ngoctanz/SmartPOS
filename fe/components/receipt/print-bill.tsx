"use client";

import * as React from "react";
import { Receipt } from "@/service/receipt.service";
import { format } from "date-fns";

interface PrintBillProps {
  receipt: Receipt;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export const PrintBill = React.forwardRef<HTMLDivElement, PrintBillProps>(
  (
    {
      receipt,
      storeName = "SMARTPOS MINIMART",
      storeAddress,
      storePhone = "Hotline: 1900 xxxx",
    },
    ref
  ) => {
    const branchName =
      typeof receipt.branchId === "object"
        ? receipt.branchId.branchName
        : "Chi nhánh";
    const branchAddress =
      typeof receipt.branchId === "object"
        ? receipt.branchId.address
        : storeAddress;
    const cashierName =
      typeof receipt.createdBy === "object"
        ? receipt.createdBy.name || receipt.createdBy.userName
        : "NV";

    const paymentMethodText =
      receipt.paymentMethod === "cash"
        ? "Tiền mặt"
        : receipt.paymentMethod === "card"
        ? "Thẻ"
        : "Chuyển khoản";

    return (
      <div
        ref={ref}
        className="print-bill bg-white text-black p-4"
        style={{
          width: "80mm",
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.4",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold uppercase">{storeName}</h1>
          <p className="text-xs">{branchName}</p>
          {branchAddress && <p className="text-xs">{branchAddress}</p>}
          <p className="text-xs">{storePhone}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-2" />

        {/* Bill Info */}
        <div className="mb-3">
          <h2 className="text-center font-bold text-base uppercase mb-2">
            HÓA ĐƠN BÁN HÀNG
          </h2>
          <div className="flex justify-between text-xs">
            <span>Số HĐ:</span>
            <span className="font-semibold">{receipt.code}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Ngày:</span>
            <span>
              {format(new Date(receipt.createdAt), "dd/MM/yyyy HH:mm")}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Thu ngân:</span>
            <span>{cashierName}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-2" />

        {/* Product List Header */}
        <div className="text-xs">
          <div className="flex justify-between font-bold border-b pb-1 mb-1">
            <span className="flex-1">Sản phẩm</span>
            <span className="w-12 text-right">SL</span>
            <span className="w-20 text-right">Đơn giá</span>
            <span className="w-20 text-right">T.Tiền</span>
          </div>

          {/* Product Items */}
          {receipt.listProduct.map((item, index) => (
            <div key={index} className="mb-1">
              <div className="font-medium truncate">{item.productName}</div>
              <div className="flex justify-between text-xs">
                <span className="flex-1"></span>
                <span className="w-12 text-right">{item.quantity}</span>
                <span className="w-20 text-right">
                  {item.salePrice.toLocaleString("vi-VN")}
                </span>
                <span className="w-20 text-right">
                  {(item.salePrice * item.quantity).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-2" />

        {/* Total */}
        <div className="text-sm">
          <div className="flex justify-between mb-1">
            <span>Số lượng SP:</span>
            <span>
              {receipt.listProduct.reduce((sum, p) => sum + p.quantity, 0)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>TỔNG CỘNG:</span>
            <span>{receipt.totalAmount.toLocaleString("vi-VN")} đ</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Phương thức TT:</span>
            <span>{paymentMethodText}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-2" />

        {/* Footer */}
        <div className="text-center text-xs mt-4">
          <p className="font-semibold">Cảm ơn Quý khách!</p>
          <p>Hẹn gặp lại</p>
          <p className="mt-2 text-[10px] text-gray-600">
            Hóa đơn này có giá trị xuất HDDT
          </p>
        </div>

        {/* Barcode placeholder */}
        <div className="text-center mt-3">
          <div className="inline-block px-2 py-1 border border-black text-xs font-mono">
            {receipt.code}
          </div>
        </div>
      </div>
    );
  }
);

PrintBill.displayName = "PrintBill";

// Print styles
export const printStyles = `
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    body * {
      visibility: hidden;
    }
    
    .print-bill,
    .print-bill * {
      visibility: visible;
    }
    
    .print-bill {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm !important;
      padding: 5mm !important;
    }
  }
`;
