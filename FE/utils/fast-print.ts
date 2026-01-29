/**
 * Fast Print Service
 *
 * Service tối ưu tốc độ in ấn cho POS
 * - Pre-render HTML trước khi gọi API
 * - Cache styles/templates
 * - Batch update content
 * - Integration với Print Queue
 *
 * @module fast-print
 */

import { CartItem } from "@/components/receipt";
import { Receipt } from "@/service/receipt.service";
import { format } from "date-fns";
import {
  enqueueJob,
  preWarmIframe,
  cancelJobsByReceiptCode,
} from "./print-queue";

// === Types ===

export interface ReceiptPrintData {
  /** Mã hóa đơn (hoặc placeholder nếu chưa có) */
  code: string;
  /** Danh sách sản phẩm */
  products: Array<{
    productName: string;
    quantity: number;
    salePrice: number;
  }>;
  /** Tổng tiền */
  totalAmount: number;
  /** Phương thức thanh toán */
  paymentMethod: "cash" | "transfer" | "card";
  /** Thông tin chi nhánh */
  branchName?: string;
  branchAddress?: string;
  /** Tên nhân viên */
  staffName?: string;
  /** Thời điểm tạo */
  createdAt: Date;
  /** Tiền khách đưa (cash) */
  customerPaid?: number;
  /** QR info (transfer) */
  qrCode?: string;
  accountName?: string;
  accountNumber?: string;
  description?: string;
}

export interface FastPrintOptions {
  /** Callback khi in xong */
  onComplete?: () => void;
  /** Callback khi lỗi */
  onError?: (error: Error) => void;
  /** Skip queue, in trực tiếp (không khuyến khích) */
  skipQueue?: boolean;
}

// === Paper Config ===

type PaperSize = "58mm" | "80mm";

interface PaperConfig {
  width: string;
  baseFontSize: number;
  qrSize: number;
  padding: string;
}

const PAPER_CONFIGS: Record<PaperSize, PaperConfig> = {
  "58mm": {
    width: "58mm",
    baseFontSize: 11,
    qrSize: 100,
    padding: "2mm",
  },
  "80mm": {
    width: "80mm",
    baseFontSize: 13,
    qrSize: 140,
    padding: "3mm",
  },
};

const DEFAULT_PAPER_SIZE: PaperSize = "80mm";

// === Cached Styles ===

let cachedStyles: string | null = null;

function getPaperConfig(): PaperConfig {
  return PAPER_CONFIGS[DEFAULT_PAPER_SIZE];
}

/**
 * Generate print styles - cached để tái sử dụng
 */
function getPrintStyles(): string {
  if (cachedStyles) return cachedStyles;

  const config = getPaperConfig();
  const { width, baseFontSize, padding } = config;

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
    .separator { 
      border: none; 
      border-top: 1px dashed #000; 
      margin: 8px 0; 
      height: 0;
    }
    .separator-solid { 
      border: none; 
      border-top: 1.5px solid #000; 
      margin: 8px 0; 
      height: 0;
    }
  `;

  return cachedStyles;
}

// === HTML Generation ===

/**
 * Generate bill HTML từ data
 * Optimized: inline styles để giảm dependency
 */
function generateBillHTML(data: ReceiptPrintData): string {
  const config = getPaperConfig();
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

  // QR Section cho transfer
  const qrSectionHTML =
    paymentMethod === "transfer" && qrCode
      ? `
      <hr class="separator" />
      <div class="text-center">
        <p class="font-semibold text-sm mb-2">Quét mã QR để thanh toán</p>
        <img src="${qrCode}" alt="QR Code" class="mx-auto" style="max-width: ${config.qrSize}px; height: auto;" />
        ${accountName ? `<p class="text-xs mt-2 font-medium">${accountName}</p>` : ""}
        ${accountNumber ? `<p class="text-xs">STK: ${accountNumber}</p>` : ""}
        ${description ? `<p class="text-xs text-gray-600">ND: ${description}</p>` : ""}
      </div>
    `
      : "";

  // Cash change section
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
    <div class="print-bill bg-white text-black" style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: ${config.baseFontSize}px; line-height: 1.4;">
      <!-- Header -->
      <div class="text-center mb-3">
        <h1 class="text-xl font-bold uppercase">${branchName}</h1>
        ${branchAddress ? `<p class="text-sm">${branchAddress}</p>` : ""}
      </div>

      <!-- Tiêu đề hóa đơn -->
      <div class="text-center mb-2">
        <h2 class="font-bold text-base uppercase">HÓA ĐƠN BÁN HÀNG</h2>
        <p class="text-sm">Số HĐ: ${code}</p>
        <p class="text-sm">Ngày ${format(createdAt, "dd")} tháng ${format(createdAt, "MM")} năm ${format(createdAt, "yyyy")}</p>
      </div>

      <hr class="separator-solid" />

      <!-- Products Header -->
      <div class="text-sm">
        <div class="flex font-bold pb-1 mb-1" style="border-bottom: 1.5px solid #000;">
          <span class="flex-1">Đơn giá</span>
          <span style="width: 15%; text-align: center; flex-shrink: 0;">SL</span>
          <span style="width: 35%; text-align: right; flex-shrink: 0;">Thành tiền</span>
        </div>
        
        <!-- Products List -->
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

      <!-- Total Section -->
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

      <!-- Thông báo đổi trả -->
      <div class="text-center text-xs mt-3">
        <p style="font-style: italic;">Hàng lỗi đổi trả trong 3 ngày (giữ lại hóa đơn),</p>
        <p style="font-style: italic;">khách vui lòng kiểm tra tiền và hàng trước khi rời</p>
        <p style="font-style: italic;">khỏi shop, mọi khiếu nại shop sẽ không giải quyết.</p>
      </div>

      <!-- Footer -->
      <div class="text-center mt-3">
        <p class="font-bold text-sm">Cảm ơn và hẹn gặp lại!</p>
      </div>
    </div>
  `;
}

// === Pre-render Support ===

/**
 * Pre-render HTML với placeholder code
 * Dùng khi muốn in ngay mà chưa có mã từ server
 */
export function preRenderReceipt(params: {
  cartItems: CartItem[];
  totalAmount: number;
  paymentMethod: "cash" | "transfer" | "card";
  branchName?: string;
  branchAddress?: string;
  staffName?: string;
  customerPaid?: number;
  qrCode?: string;
  accountName?: string;
  accountNumber?: string;
  description?: string;
}): { html: string; placeholderCode: string } {
  const {
    cartItems,
    totalAmount,
    paymentMethod,
    branchName,
    branchAddress,
    customerPaid,
    qrCode,
    accountName,
    accountNumber,
    description,
  } = params;

  // Tạo placeholder code để tracking
  const placeholderCode = `PENDING-${Date.now()}`;

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
    qrCode,
    accountName,
    accountNumber,
    description,
  });

  return { html, placeholderCode };
}

// === Fast Print Functions ===

/**
 * Print receipt nhanh - dùng queue để đảm bảo thứ tự
 */
export function fastPrintReceipt(
  receipt: Receipt,
  options?: FastPrintOptions & {
    branchName?: string;
    branchAddress?: string;
    staffName?: string;
  },
): string {
  const { onComplete, onError, branchName, branchAddress } = options || {};

  // Extract branch info từ receipt nếu không truyền vào
  const finalBranchName =
    branchName ||
    (typeof receipt.branchId === "object"
      ? receipt.branchId.branchName
      : undefined);

  const finalBranchAddress =
    branchAddress ||
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
    branchName: finalBranchName,
    branchAddress: finalBranchAddress,
    customerPaid: receipt.customerPaid ?? undefined,
    createdAt: new Date(receipt.createdAt),
    // QR only for pending transfer
    ...(receipt.paymentMethod === "transfer" && receipt.status === "pending"
      ? {
          qrCode: receipt.paymentInfo?.qrCode,
          accountName: receipt.paymentInfo?.accountName,
          accountNumber: receipt.paymentInfo?.accountNumber,
          description: receipt.paymentInfo?.description,
        }
      : {}),
  });

  // Enqueue job
  return enqueueJob({
    receiptCode: receipt.code,
    html,
    title: "Hóa đơn",
    onComplete,
    onError,
  });
}

/**
 * Print draft với QR (transfer payment preview)
 */
export function fastPrintDraftWithQR(params: {
  code: string;
  cartItems: CartItem[];
  totalAmount: number;
  qrCode?: string;
  accountName?: string;
  accountNumber?: string;
  description?: string;
  branchName?: string;
  branchAddress?: string;
  staffName?: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}): string {
  const {
    code,
    cartItems,
    totalAmount,
    qrCode,
    accountName,
    accountNumber,
    description,
    branchName,
    branchAddress,
    onComplete,
    onError,
  } = params;

  const html = generateBillHTML({
    code,
    products: cartItems.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      salePrice: item.salePrice,
    })),
    totalAmount,
    paymentMethod: "transfer",
    branchName,
    branchAddress,
    createdAt: new Date(),
    qrCode,
    accountName,
    accountNumber,
    description,
  });

  return enqueueJob({
    receiptCode: code,
    html,
    title: "Hóa đơn",
    onComplete,
    onError,
  });
}

/**
 * Print cash receipt preview
 */
export function fastPrintCashPreview(params: {
  code: string;
  cartItems: CartItem[];
  totalAmount: number;
  customerPaid?: number;
  branchName?: string;
  branchAddress?: string;
  staffName?: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}): string {
  const {
    code,
    cartItems,
    totalAmount,
    customerPaid,
    branchName,
    branchAddress,
    onComplete,
    onError,
  } = params;

  const html = generateBillHTML({
    code,
    products: cartItems.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      salePrice: item.salePrice,
    })),
    totalAmount,
    paymentMethod: "cash",
    branchName,
    branchAddress,
    createdAt: new Date(),
    customerPaid,
  });

  return enqueueJob({
    receiptCode: code,
    html,
    title: "Hóa đơn",
    onComplete,
    onError,
  });
}

// === Cancel Functions ===

/**
 * Hủy tất cả print jobs của một receipt
 */
export function cancelReceiptPrint(receiptCode: string): number {
  return cancelJobsByReceiptCode(receiptCode);
}

// === Initialization ===

/**
 * Initialize fast print service
 * Gọi một lần khi app khởi động
 */
export function initFastPrint(): void {
  preWarmIframe();
  console.log("[FastPrint] Service initialized");
}

// Export types
export type { PaperSize, PaperConfig };
