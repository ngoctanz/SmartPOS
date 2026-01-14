import { CartItem } from "@/components/receipt";
import { Receipt } from "@/service/receipt.service";
import { format } from "date-fns";

// === Paper Size Config ===
// Hỗ trợ các kích thước giấy in nhiệt phổ biến: 58mm, 80mm
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

// Default paper size - có thể lấy từ localStorage hoặc config sau này
const DEFAULT_PAPER_SIZE: PaperSize = "80mm";

function getPaperConfig(): PaperConfig {
  // TODO: Có thể đọc từ localStorage để user tự config
  // const saved = localStorage.getItem("printer_paper_size") as PaperSize;
  // return PAPER_CONFIGS[saved] || PAPER_CONFIGS[DEFAULT_PAPER_SIZE];
  return PAPER_CONFIGS[DEFAULT_PAPER_SIZE];
}

// Print styles - responsive theo paper size
function getPrintStyles(config: PaperConfig): string {
  const { width, baseFontSize, padding } = config;

  return `
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
    body { 
      padding: 0;
      margin: 0;
    }
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
  .text-notice { font-size: ${Math.round(
    baseFontSize * 0.77
  )}px; line-height: 1.3; }
  .font-bold { font-weight: bold; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .uppercase { text-transform: uppercase; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .inline-block { display: inline-block; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .flex-1 { flex: 1; }
  .border { border: 1px solid black; }
  .border-t { border-top: 1px solid black; }
  .border-b { border-bottom: 1px solid black; }
  .border-dashed { border-style: dashed; }
  .border-black { border-color: black; }
  .mb-1 { margin-bottom: 4px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-3 { margin-bottom: 12px; }
  .mb-4 { margin-bottom: 16px; }
  .mt-1 { margin-top: 4px; }
  .mt-2 { margin-top: 8px; }
  .mt-3 { margin-top: 12px; }
  .mt-4 { margin-top: 16px; }
  .my-2 { margin-top: 8px; margin-bottom: 8px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .px-2 { padding-left: 6px; padding-right: 6px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .pb-1 { padding-bottom: 4px; }
  .p-3 { padding: 12px; }
  .w-6 { width: 24px; }
  .w-8 { width: 32px; }
  .w-12 { width: 35px; }
  .w-16 { width: 55px; }
  .w-20 { width: 65px; }
  .w-24 { width: 80px; }
  .text-gray-600 { color: #666; }
  .font-mono { font-family: "Courier New", Courier, monospace; }
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
}

interface PrintData {
  code: string;
  products: { productName: string; quantity: number; salePrice: number }[];
  totalAmount: number;
  paymentMethod: "cash" | "transfer" | "card";
  branchName?: string;
  branchAddress?: string;
  staffName?: string;
  createdAt: Date;
  // QR info (transfer)
  qrCode?: string;
  accountName?: string;
  accountNumber?: string;
  description?: string;
  // Cash info
  customerPaid?: number;
}

function generateBillHTML(data: PrintData): string {
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

  const qrSectionHTML =
    paymentMethod === "transfer" && qrCode
      ? `
      <hr class="separator" />
      <div class="text-center">
        <p class="font-semibold text-sm mb-2">Quét mã QR để thanh toán</p>
        <img src="${qrCode}" alt="QR Code" class="mx-auto" style="max-width: ${
          config.qrSize
        }px; height: auto;" />
        ${
          accountName
            ? `<p class="text-xs mt-2 font-medium">${accountName}</p>`
            : ""
        }
        ${accountNumber ? `<p class="text-xs">STK: ${accountNumber}</p>` : ""}
        ${
          description
            ? `<p class="text-xs text-gray-600">ND: ${description}</p>`
            : ""
        }
      </div>
    `
      : "";

  return `
    <div class="print-bill bg-white text-black" style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: ${
    config.baseFontSize
  }px; line-height: 1.4;">
      <!-- Header: Tên chi nhánh lớn nhất -->
      <div class="text-center mb-3">
        <h1 class="text-xl font-bold uppercase">${branchName}</h1>
        ${branchAddress ? `<p class="text-sm">${branchAddress}</p>` : ""}
      </div>

      <!-- Tiêu đề hóa đơn -->
      <div class="text-center mb-2">
        <h2 class="font-bold text-base uppercase">HÓA ĐƠN BÁN HÀNG</h2>
        <p class="text-sm">Số HĐ: ${code}</p>
        <p class="text-sm">Ngày ${format(createdAt, "dd")} tháng ${format(
    createdAt,
    "MM"
  )} năm ${format(createdAt, "yyyy")}</p>
      </div>

      <hr class="separator-solid" />

      <!-- Products Header -->
      <div class="text-sm">
        <div class="flex font-bold pb-1 mb-1" style="border-bottom: 1.5px solid #000;">
          <span class="flex-1">Đơn giá</span>
          <span style="width: 40px; text-align: center;">SL</span>
          <span style="width: 85px; text-align: right; white-space: nowrap;">Thành tiền</span>
        </div>
        
        <!-- Products List -->
        ${products
          .map(
            (item, idx) => `
          <div>
            <div class="mb-2">
              <div class="font-medium">${item.productName}</div>
              <div class="flex text-sm">
                <span class="flex-1">${item.salePrice.toLocaleString(
                  "vi-VN"
                )}</span>
                <span style="width: 40px; text-align: center;">${
                  item.quantity
                }</span>
                <span style="width: 85px; text-align: right;">${(
                  item.salePrice * item.quantity
                ).toLocaleString("vi-VN")}</span>
              </div>
            </div>
            ${
              idx < products.length - 1
                ? '<hr class="separator" />'
                : ""
            }
          </div>
        `
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
        ${
          paymentMethod === "cash" && customerPaid
            ? `
        <div class="flex justify-between font-bold mb-1">
          <span>Tiền thừa trả khách:</span>
          <span>${
            changeAmount > 0 ? changeAmount.toLocaleString("vi-VN") : 0
          }</span>
        </div>
        `
            : ""
        }
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

// Hidden iframe singleton
let printIframe: HTMLIFrameElement | null = null;

function getOrCreateIframe(): HTMLIFrameElement {
  if (!printIframe || !document.body.contains(printIframe)) {
    printIframe = document.createElement("iframe");
    printIframe.style.cssText =
      "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;";
    document.body.appendChild(printIframe);
  }
  return printIframe;
}

function executePrint(html: string, title: string): void {
  const config = getPaperConfig();
  const iframe = getOrCreateIframe();
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>${getPrintStyles(config)}</style>
    </head>
    <body>${html}</body>
    </html>
  `);
  doc.close();

  // Wait for images then print
  const images = doc.getElementsByTagName("img");
  let hasPrinted = false;
  let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

  const triggerPrint = () => {
    if (hasPrinted) return; // Prevent duplicate print
    hasPrinted = true;
    if (fallbackTimeout) clearTimeout(fallbackTimeout); // Cancel fallback
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };

  if (images.length > 0) {
    let loaded = 0;
    const total = images.length;

    const onLoad = () => {
      loaded++;
      if (loaded >= total) setTimeout(triggerPrint, 50);
    };

    for (const img of images) {
      if (img.complete) onLoad();
      else {
        img.onload = onLoad;
        img.onerror = onLoad;
      }
    }
    // Fallback if images take too long
    fallbackTimeout = setTimeout(triggerPrint, 1000);
  } else {
    setTimeout(triggerPrint, 50);
  }
}

/**
 * Print receipt directly - opens browser print dialog immediately
 */
export function printReceipt(
  receipt: Receipt,
  options?: {
    branchName?: string;
    branchAddress?: string;
    staffName?: string;
  }
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
  const staffName =
    options?.staffName ||
    (typeof receipt.createdBy === "object"
      ? receipt.createdBy.name || receipt.createdBy.userName
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
    staffName,
    customerPaid: receipt.customerPaid ?? undefined, // Dùng customerPaid từ receipt (đã có từ BE service)
    createdAt: new Date(receipt.createdAt),
    // Show QR only if transfer and pending (not paid yet)
    ...(receipt.paymentMethod === "transfer" && receipt.status === "pending"
      ? {
          qrCode: receipt.paymentInfo?.qrCode,
          accountName: receipt.paymentInfo?.accountName,
          accountNumber: receipt.paymentInfo?.accountNumber,
          description: receipt.paymentInfo?.description,
        }
      : {}),
  });

  executePrint(html, `Hóa đơn - ${receipt.code}`);
}

/**
 * Print draft receipt with QR (for transfer payment preview)
 */
interface DraftPrintData {
  code: string;
  cartItems: CartItem[];
  totalAmount: number;
  paymentMethod: string;
  qrCode?: string;
  accountName?: string;
  accountNumber?: string;
  description?: string;
  branchName?: string;
  branchAddress?: string;
  staffName?: string;
}

export function printDraftWithQR(data: DraftPrintData): void {
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
    staffName,
  } = data;

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
    staffName,
    createdAt: new Date(),
    qrCode,
    accountName,
    accountNumber,
    description,
  });

  executePrint(html, `Hóa đơn - ${code}`);
}

/**
 * Print cash receipt preview
 */
interface CashPreviewData {
  code: string;
  cartItems: CartItem[];
  totalAmount: number;
  paymentMethod: string;
  customerPaid?: number;
  branchName?: string;
  branchAddress?: string;
  staffName?: string;
}

export function printCashPreview(data: CashPreviewData): void {
  const {
    code,
    cartItems,
    totalAmount,
    customerPaid,
    branchName,
    branchAddress,
    staffName,
  } = data;

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
    staffName,
    createdAt: new Date(),
    customerPaid,
  });

  executePrint(html, `Hóa đơn - ${code}`);
}
