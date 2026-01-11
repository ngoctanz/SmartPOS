import { CartItem } from "@/components/receipt";
import { Receipt } from "@/service/receipt.service";
import { format } from "date-fns";

// Print styles for 80mm thermal printer
const PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: monospace;
    padding: 3mm;
    width: 80mm;
    margin: 0 auto;
    font-size: 11px;
    line-height: 1.3;
  }
  img { max-width: 100%; height: auto; }
  @media print {
    @page { size: 80mm auto; margin: 0; }
    body { padding: 3mm; }
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-xs { font-size: 9px; }
  .text-sm { font-size: 11px; }
  .text-base { font-size: 12px; }
  .text-lg { font-size: 14px; }
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
  .mb-1 { margin-bottom: 3px; }
  .mb-2 { margin-bottom: 6px; }
  .mb-3 { margin-bottom: 9px; }
  .mb-4 { margin-bottom: 12px; }
  .mt-1 { margin-top: 3px; }
  .mt-2 { margin-top: 6px; }
  .mt-3 { margin-top: 9px; }
  .mt-4 { margin-top: 12px; }
  .my-2 { margin-top: 6px; margin-bottom: 6px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .px-2 { padding-left: 6px; padding-right: 6px; }
  .py-1 { padding-top: 3px; padding-bottom: 3px; }
  .pb-1 { padding-bottom: 3px; }
  .p-3 { padding: 12px; }
  .w-12 { width: 40px; }
  .w-20 { width: 70px; }
  .text-gray-600 { color: #666; }
  .font-mono { font-family: monospace; }
  .bg-white { background: white; }
  .text-black { color: black; }
`;

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
  const {
    code,
    products,
    totalAmount,
    paymentMethod,
    branchName = "Chi nhánh",
    branchAddress,
    staffName,
    createdAt,
    qrCode,
    accountName,
    accountNumber,
    description,
    customerPaid,
  } = data;

  const paymentMethodText =
    paymentMethod === "cash"
      ? "Tiền mặt"
      : paymentMethod === "card"
      ? "Thẻ"
      : "Chuyển khoản";

  const changeAmount = customerPaid ? customerPaid - totalAmount : 0;
  const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);

  const productsHTML = products
    .map(
      (item) => `
      <div class="mb-1">
        <div class="font-medium truncate">${item.productName}</div>
        <div class="flex justify-between text-xs">
          <span class="flex-1"></span>
          <span class="w-12 text-right">${item.quantity}</span>
          <span class="w-20 text-right">${item.salePrice.toLocaleString(
            "vi-VN"
          )}</span>
          <span class="w-20 text-right">${(
            item.salePrice * item.quantity
          ).toLocaleString("vi-VN")}</span>
        </div>
      </div>
    `
    )
    .join("");

  const qrSectionHTML =
    paymentMethod === "transfer" && qrCode
      ? `
      <div class="border-t border-dashed border-black my-2"></div>
      <div class="text-center">
        <p class="font-semibold text-xs mb-2">Quét mã QR để thanh toán</p>
        <img src="${qrCode}" alt="QR Code" class="mx-auto" style="max-width: 120px; height: auto;" />
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

  const cashSectionHTML =
    paymentMethod === "cash" && customerPaid
      ? `
      <div class="border-t border-dashed border-black my-2"></div>
      <div class="text-xs">
        <div class="flex justify-between mb-1">
          <span>Khách đưa:</span>
          <span>${customerPaid.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="flex justify-between">
          <span>Tiền thừa:</span>
          <span>${
            changeAmount > 0 ? changeAmount.toLocaleString("vi-VN") : 0
          } đ</span>
        </div>
      </div>
    `
      : "";

  return `
    <div class="print-bill bg-white text-black p-3" style="width: 80mm; font-family: monospace; font-size: 11px; line-height: 1.3;">
      <!-- Header -->
      <div class="text-center mb-4">
        <h1 class="text-lg font-bold uppercase">SMARTPOS MINIMART</h1>
        <p class="text-xs">${branchName}</p>
        ${branchAddress ? `<p class="text-xs">${branchAddress}</p>` : ""}
        <p class="text-xs">Hotline: 1900 xxxx</p>
      </div>

      <div class="border-t border-dashed border-black my-2"></div>

      <!-- Bill Info -->
      <div class="mb-3">
        <h2 class="text-center font-bold text-base uppercase mb-2">HÓA ĐƠN BÁN HÀNG</h2>
        <div class="flex justify-between text-xs">
          <span>Số HĐ:</span>
          <span class="font-semibold">${code}</span>
        </div>
        <div class="flex justify-between text-xs">
          <span>Ngày:</span>
          <span>${format(createdAt, "dd/MM/yyyy HH:mm")}</span>
        </div>
        ${
          staffName
            ? `
        <div class="flex justify-between text-xs">
          <span>Thu ngân:</span>
          <span>${staffName}</span>
        </div>
        `
            : ""
        }
      </div>

      <div class="border-t border-dashed border-black my-2"></div>

      <!-- Products -->
      <div class="text-xs">
        <div class="flex justify-between font-bold border-b pb-1 mb-1">
          <span class="flex-1">Sản phẩm</span>
          <span class="w-12 text-right">SL</span>
          <span class="w-20 text-right">Đơn giá</span>
          <span class="w-20 text-right">T.Tiền</span>
        </div>
        ${productsHTML}
      </div>

      <div class="border-t border-dashed border-black my-2"></div>

      <!-- Total -->
      <div class="text-sm">
        <div class="flex justify-between mb-1">
          <span>Số lượng SP:</span>
          <span>${totalQty}</span>
        </div>
        <div class="flex justify-between font-bold text-base">
          <span>TỔNG CỘNG:</span>
          <span>${totalAmount.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="flex justify-between text-xs mt-1">
          <span>Phương thức TT:</span>
          <span>${paymentMethodText}</span>
        </div>
      </div>

      ${qrSectionHTML}
      ${cashSectionHTML}

      <div class="border-t border-dashed border-black my-2"></div>

      <!-- Footer -->
      <div class="text-center text-xs mt-4">
        <p class="font-semibold">Cảm ơn Quý khách!</p>
        <p>Hẹn gặp lại</p>
        <p class="mt-2" style="font-size: 8px; color: #666;">Hóa đơn này có giá trị xuất HDDT</p>
      </div>

      <!-- Barcode -->
      <div class="text-center mt-3">
        <div class="inline-block px-2 py-1 border border-black text-xs font-mono">${code}</div>
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
      <style>${PRINT_STYLES}</style>
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
export function printReceipt(receipt: Receipt): void {
  const branchName =
    typeof receipt.branchId === "object"
      ? receipt.branchId.branchName
      : undefined;
  const branchAddress =
    typeof receipt.branchId === "object" ? receipt.branchId.address : undefined;
  const staffName =
    typeof receipt.createdBy === "object"
      ? receipt.createdBy.name || receipt.createdBy.userName
      : undefined;

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
  staffName?: string;
}

export function printCashPreview(data: CashPreviewData): void {
  const { code, cartItems, totalAmount, customerPaid, branchName, staffName } =
    data;

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
    staffName,
    createdAt: new Date(),
    customerPaid,
  });

  executePrint(html, `Hóa đơn - ${code}`);
}
