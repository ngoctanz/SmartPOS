/**
 * Optimistic Print Service
 *
 * Hệ thống in tối ưu cho POS với khối lượng lớn (hàng nghìn đơn/ngày)
 *
 * Flow an toàn:
 * 1. Pre-render HTML vào iframe NGAY khi user bấm thanh toán (giảm latency)
 * 2. API chạy song song
 * 3. CHỜ API xong → update mã thật → trigger print
 *
 * Đảm bảo: Hóa đơn LUÔN có mã thật từ server
 *
 * @module optimistic-print
 */

import { CartItem } from "@/components/receipt";
import { Receipt } from "@/service/receipt.service";
import { format } from "date-fns";

// === Types ===

export interface PrintSession {
  id: string;
  receiptCode: string | null;
  status: "pending" | "ready" | "printed" | "error";
  createdAt: number;
  error?: Error;
}

// === Paper Config ===

interface PaperConfig {
  width: string;
  baseFontSize: number;
  qrSize: number;
  padding: string;
}

const PAPER_CONFIG: PaperConfig = {
  width: "80mm",
  baseFontSize: 13,
  qrSize: 140,
  padding: "3mm",
};

// === Cached Styles (singleton) ===

let cachedStyles: string | null = null;

function getPrintStyles(): string {
  if (cachedStyles) return cachedStyles;

  const { width, baseFontSize, padding } = PAPER_CONFIG;

  cachedStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      padding: 0;
      width: ${width};
      margin: 0;
      font-size: ${baseFontSize}px;
      line-height: 1.4;
    }
    img { max-width: 100%; height: auto; }
    @media print {
      @page { size: ${width} auto; margin: 0; }
      body { padding: 0; margin: 0; }
    }
    .print-bill {
      padding: ${padding} !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-xs { font-size: ${Math.round(baseFontSize * 0.85)}px; }
    .text-sm { font-size: ${baseFontSize}px; }
    .text-base { font-size: ${Math.round(baseFontSize * 1.08)}px; }
    .text-lg { font-size: ${Math.round(baseFontSize * 1.23)}px; }
    .text-xl { font-size: ${Math.round(baseFontSize * 1.38)}px; }
    .font-bold { font-weight: bold; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .uppercase { text-transform: uppercase; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .flex-1 { flex: 1; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-3 { margin-bottom: 12px; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 12px; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .pb-1 { padding-bottom: 4px; }
    .text-gray-600 { color: #666; }
    .bg-white { background: white; }
    .text-black { color: black; }
    .separator { border: none; border-top: 1px dashed #000; margin: 8px 0; height: 0; }
    .separator-solid { border: none; border-top: 1.5px solid #000; margin: 8px 0; height: 0; }
    #receipt-code { transition: none; }
  `;

  return cachedStyles;
}

// === HTML Generation ===

interface BillData {
  code: string;
  products: Array<{
    productName: string;
    quantity: number;
    salePrice: number;
  }>;
  totalAmount: number;
  paymentMethod: "cash" | "transfer" | "card";
  branchName?: string;
  branchAddress?: string;
  createdAt: Date;
  customerPaid?: number;
  qrCode?: string;
  accountName?: string;
  accountNumber?: string;
  description?: string;
}

function generateBillHTML(data: BillData): string {
  const {
    code,
    products,
    totalAmount,
    paymentMethod,
    branchName = "Chi nhánh",
    branchAddress,
    createdAt,
    qrCode,
    accountName,
    accountNumber,
    description,
    customerPaid,
  } = data;

  const changeAmount = customerPaid ? customerPaid - totalAmount : 0;
  const styles = getPrintStyles();

  const qrSectionHTML =
    paymentMethod === "transfer" && qrCode
      ? `
      <hr class="separator" />
      <div class="text-center">
        <p class="font-semibold text-sm mb-2">Quét mã QR để thanh toán</p>
        <img src="${qrCode}" alt="QR Code" class="mx-auto" style="max-width: ${PAPER_CONFIG.qrSize}px; height: auto;" />
        ${accountName ? `<p class="text-xs mt-2 font-medium">${accountName}</p>` : ""}
        ${accountNumber ? `<p class="text-xs">STK: ${accountNumber}</p>` : ""}
        ${description ? `<p class="text-xs text-gray-600">ND: ${description}</p>` : ""}
      </div>
    `
      : "";

  const changeSection =
    paymentMethod === "cash" && customerPaid
      ? `
      <div class="flex justify-between font-bold mb-1">
        <span>Tiền thừa trả khách:</span>
        <span>${changeAmount > 0 ? changeAmount.toLocaleString("vi-VN") : 0}</span>
      </div>
    `
      : "";

  return `
    <style>${styles}</style>
    <div class="print-bill bg-white text-black" style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: ${PAPER_CONFIG.baseFontSize}px; line-height: 1.4;">
      <div class="text-center mb-3">
        <h1 class="text-xl font-bold uppercase">${branchName}</h1>
        ${branchAddress ? `<p class="text-sm">${branchAddress}</p>` : ""}
      </div>

      <div class="text-center mb-2">
        <h2 class="font-bold text-base uppercase">HÓA ĐƠN BÁN HÀNG</h2>
        <p class="text-sm">Số HĐ: <span id="receipt-code">${code}</span></p>
        <p class="text-sm">Ngày ${format(createdAt, "dd")} tháng ${format(createdAt, "MM")} năm ${format(createdAt, "yyyy")}</p>
      </div>

      <hr class="separator-solid" />

      <div class="text-sm">
        <div class="flex font-bold pb-1 mb-1" style="border-bottom: 1.5px solid #000;">
          <span class="flex-1">Đơn giá</span>
          <span style="width: 15%; text-align: center; flex-shrink: 0;">SL</span>
          <span style="width: 35%; text-align: right; flex-shrink: 0;">Thành tiền</span>
        </div>
        
        ${products
          .map(
            (item, idx) => `
          <div>
            <div class="mb-2">
              <div class="font-medium" style="word-wrap: break-word; overflow-wrap: break-word;">${item.productName}</div>
              <div class="flex text-sm">
                <span class="flex-1">${item.salePrice.toLocaleString("vi-VN")}</span>
                <span style="width: 15%; text-align: center; flex-shrink: 0;">${item.quantity}</span>
                <span style="width: 35%; text-align: right; flex-shrink: 0;">${(item.salePrice * item.quantity).toLocaleString("vi-VN")}</span>
              </div>
            </div>
            ${idx < products.length - 1 ? '<hr class="separator" />' : ""}
          </div>
        `,
          )
          .join("")}
      </div>

      <hr class="separator" />

      <div class="text-sm">
        <div class="flex justify-between mb-1">
          <span class="font-bold">Tổng tiền hàng:</span>
          <span class="font-bold">${totalAmount.toLocaleString("vi-VN")}</span>
        </div>
        <div class="flex justify-between mb-1">
          <span class="font-bold">Tổng thanh toán:</span>
          <span class="font-bold">${totalAmount.toLocaleString("vi-VN")}</span>
        </div>
        ${changeSection}
      </div>

      ${qrSectionHTML}

      <hr class="separator" />

      <div class="text-center text-xs mt-3">
        <p style="font-style: italic;">Hàng lỗi đổi trả trong 3 ngày (giữ lại hóa đơn),</p>
        <p style="font-style: italic;">khách vui lòng kiểm tra tiền và hàng trước khi rời</p>
        <p style="font-style: italic;">khỏi shop, mọi khiếu nại shop sẽ không giải quyết.</p>
      </div>

      <div class="text-center mt-3">
        <p class="font-bold text-sm">Cảm ơn và hẹn gặp lại!</p>
      </div>
    </div>
  `;
}

// === Iframe Management (Singleton) ===

let printIframe: HTMLIFrameElement | null = null;
let currentSession: PrintSession | null = null;
let sessionCounter = 0;

function getOrCreateIframe(): HTMLIFrameElement {
  if (typeof window === "undefined") {
    throw new Error("Only works in browser");
  }

  if (!printIframe || !document.body.contains(printIframe)) {
    printIframe = document.createElement("iframe");
    printIframe.id = "smartpos-print-iframe";
    printIframe.style.cssText =
      "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden; pointer-events: none;";
    document.body.appendChild(printIframe);
  }

  return printIframe;
}

function generateSessionId(): string {
  sessionCounter++;
  return `print_${Date.now()}_${sessionCounter}`;
}

function updateReceiptCodeInIframe(newCode: string): boolean {
  if (!printIframe) return false;

  try {
    const doc =
      printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!doc) return false;

    const codeElement = doc.getElementById("receipt-code");
    if (codeElement) {
      codeElement.textContent = newCode;
      return true;
    }
  } catch (e) {
    console.error("[Print] Failed to update code:", e);
  }

  return false;
}

// === Main API ===

interface OptimisticPrintParams {
  cartItems: CartItem[];
  totalAmount: number;
  paymentMethod: "cash" | "transfer";
  branchName?: string;
  branchAddress?: string;
  customerPaid?: number;
}

interface OptimisticPrintResult {
  session: PrintSession;
  triggerPrint: (realCode: string) => void;
  cancel: () => void;
}

/**
 * Pre-render HTML ngay, chờ API xong mới trigger print
 *
 * Đảm bảo:
 * - Hóa đơn LUÔN có mã thật từ server
 * - Không có race condition
 * - Session-based để tránh conflict giữa các lần in
 */
export function optimisticPrint(
  params: OptimisticPrintParams,
): OptimisticPrintResult {
  const {
    cartItems,
    totalAmount,
    paymentMethod,
    branchName,
    branchAddress,
    customerPaid,
  } = params;

  const sessionId = generateSessionId();
  const placeholderCode = `PENDING-${sessionId.slice(-8)}`;

  // Tạo session mới, invalidate session cũ
  currentSession = {
    id: sessionId,
    receiptCode: null,
    status: "pending",
    createdAt: Date.now(),
  };

  const session = currentSession;

  // Generate HTML với placeholder
  const html = generateBillHTML({
    code: placeholderCode,
    products: cartItems.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      salePrice: item.salePrice,
    })),
    totalAmount,
    paymentMethod,
    branchName,
    branchAddress,
    createdAt: new Date(),
    customerPaid,
  });

  // Pre-render vào iframe NGAY
  const iframe = getOrCreateIframe();
  const doc = iframe.contentDocument || iframe.contentWindow?.document;

  if (doc) {
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hóa đơn</title>
      </head>
      <body>${html}</body>
      </html>
    `);
    doc.close();
  }

  return {
    session,

    triggerPrint: (realCode: string) => {
      // Session validation - tránh in nhầm nếu có session mới
      if (!currentSession || currentSession.id !== sessionId) {
        console.warn("[Print] Session expired or mismatch, skipping");
        return;
      }

      if (session.status !== "pending") {
        console.warn(`[Print] Invalid session status: ${session.status}`);
        return;
      }

      // Update mã thật vào iframe
      updateReceiptCodeInIframe(realCode);
      session.receiptCode = realCode;
      session.status = "ready";

      // Trigger print
      setTimeout(() => {
        if (currentSession?.id === sessionId) {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          session.status = "printed";
        }
      }, 10);
    },

    cancel: () => {
      if (session.status === "pending") {
        session.status = "error";
        session.error = new Error("Cancelled");
      }
    },
  };
}

/**
 * In hóa đơn từ Receipt object (đã có mã thật)
 * Dùng cho các case không cần optimistic (ví dụ: in lại từ SuccessDialog)
 */
export function instantPrintReceipt(
  receipt: Receipt,
  options?: { branchName?: string; branchAddress?: string },
): void {
  const branchName =
    options?.branchName ||
    (typeof receipt.branchId === "object"
      ? receipt.branchId.branchName
      : undefined);

  const branchAddress =
    options?.branchAddress ||
    (typeof receipt.branchId === "object"
      ? receipt.branchId.address
      : undefined);

  const html = generateBillHTML({
    code: receipt.code,
    products: receipt.listProduct.map((p) => ({
      productName: p.productName,
      quantity: p.quantity,
      salePrice: p.salePrice,
    })),
    totalAmount: receipt.totalAmount,
    paymentMethod: receipt.paymentMethod as "cash" | "transfer" | "card",
    branchName,
    branchAddress,
    customerPaid: receipt.customerPaid ?? undefined,
    createdAt: new Date(receipt.createdAt),
  });

  const iframe = getOrCreateIframe();
  const doc = iframe.contentDocument || iframe.contentWindow?.document;

  if (doc) {
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hóa đơn - ${receipt.code}</title>
      </head>
      <body>${html}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 10);
  }
}

/**
 * Lấy session hiện tại (debug)
 */
export function getCurrentSession(): PrintSession | null {
  return currentSession;
}
