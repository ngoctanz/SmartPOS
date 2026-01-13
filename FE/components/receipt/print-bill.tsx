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
        className="print-bill bg-white text-black p-3"
        style={{
          width: "80mm",
          fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
          fontSize: "11px",
          lineHeight: "1.3",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold uppercase">{storeName}</h1>
          <p className="text-sm">{branchName}</p>
          {branchAddress && <p className="text-sm">{branchAddress}</p>}
          <p className="text-sm">{storePhone}</p>
        </div>

        {/* Divider - nét liền */}
        <div className="border-t border-black my-2" />

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

        {/* Divider - nét liền trước header sản phẩm */}
        <div style={{ borderTop: "1.5px solid #000", margin: "8px 0" }} />

        {/* Product List Header */}
        <div className="text-xs">
          <div className="flex font-bold pb-1 mb-1" style={{ borderBottom: "1.5px solid #000" }}>
            <span className="flex-1">Sản phẩm</span>
            <span style={{ width: 30, textAlign: "center" }}>SL</span>
            <span style={{ width: 60, textAlign: "right" }}>Đơn giá</span>
            <span style={{ width: 85, textAlign: "right", whiteSpace: "nowrap" }}>Thành tiền</span>
          </div>

          {/* Product Items */}
          {receipt.listProduct.map((item, index) => (
            <div key={index}>
              <div className="mb-1">
                <div className="font-medium truncate">{item.productName}</div>
                <div className="flex text-xs">
                  <span className="flex-1"></span>
                  <span style={{ width: 30, textAlign: "center" }}>{item.quantity}</span>
                  <span style={{ width: 60, textAlign: "right" }}>
                    {item.salePrice.toLocaleString("vi-VN")}
                  </span>
                  <span style={{ width: 85, textAlign: "right" }}>
                    {(item.salePrice * item.quantity).toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>
              {/* Đường nét đứt giữa các sản phẩm (không có ở item cuối) */}
              {index < receipt.listProduct.length - 1 && (
                <div className="border-t border-dashed border-black my-1" />
              )}
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

        {/* Thông báo đổi trả */}
        <div className="text-center text-xs mt-3" style={{ fontStyle: "italic" }}>
          <p>Hàng lỗi đổi trả trong 3 ngày (giữ lại hóa đơn),</p>
          <p>khách vui lòng kiểm tra tiền và hàng trước khi rời</p>
          <p>khỏi shop, mọi khiếu nại shop sẽ không giải quyết.</p>
        </div>

        {/* Footer */}
        <div className="text-center mt-3">
          <p className="font-bold text-sm">Cảm ơn và hẹn gặp lại!</p>
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

// Component for printing multiple receipts
interface MultiplePrintBillProps {
  receipts: Receipt[];
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export const MultiplePrintBill = React.forwardRef<
  HTMLDivElement,
  MultiplePrintBillProps
>(
  (
    {
      receipts,
      storeName = "SMARTPOS MINIMART",
      storeAddress,
      storePhone = "Hotline: 1900 xxxx",
    },
    ref
  ) => {
    return (
      <div ref={ref} className="multiple-print-bills">
        {receipts.map((receipt, index) => (
          <div
            key={receipt._id || index}
            className="print-bill-wrapper"
            style={{
              pageBreakAfter: index < receipts.length - 1 ? "always" : "auto",
            }}
          >
            <PrintBill
              receipt={receipt}
              storeName={storeName}
              storeAddress={storeAddress}
              storePhone={storePhone}
            />
          </div>
        ))}
      </div>
    );
  }
);

MultiplePrintBill.displayName = "MultiplePrintBill";

// Print styles with optimized paper size configuration for 80mm thermal printer (roll paper)
export const printStyles = `
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
    
    body * {
      visibility: hidden;
    }
    
    .print-bill,
    .print-bill *,
    .multiple-print-bills,
    .multiple-print-bills *,
    .print-bill-wrapper,
    .print-bill-wrapper * {
      visibility: visible;
    }
    
    .print-bill,
    .multiple-print-bills {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm !important;
    }
    
    .print-bill {
      padding: 5mm !important;
    }
    
    .print-bill-wrapper {
      page-break-after: always;
      page-break-inside: avoid;
    }
    
    .print-bill-wrapper:last-child {
      page-break-after: auto;
    }
  }
`;
