import { BaseEntity } from "./common";

export interface ReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
}

export type ReceiptPaymentMethod = "cash" | "card" | "transfer";
export type ReceiptStatus = "completed" | "cancelled" | "pending";
export type PaymentStatus = "pending" | "paid" | "cancelled" | "expired" | "";

export interface PaymentInfo {
  orderCode: number;
  linkId: string;
  qrCode: string;
  checkoutUrl: string;
  status: PaymentStatus;
}

export interface Receipt extends BaseEntity {
  code: string;
  branchId: string;
  createdBy: string;
  listProduct: ReceiptItem[];
  totalAmount: number;
  paymentMethod: ReceiptPaymentMethod;
  status: ReceiptStatus;
  // PayOS payment info (only for transfer)
  paymentInfo?: PaymentInfo;
}

export interface ImportReceiptItem {
  productId: string;
  barcode: string;
  productName: string;
  quantity: number;
  importPrice: number;
  subtotal: number;
}

export type ImportReceiptStatus = "pending" | "completed" | "cancelled";

export interface ImportReceipt extends BaseEntity {
  code: string;
  barcode: string;
  branchId: string | { _id: string; branchName: string };
  supplierName?: string;
  createdBy: string | { _id: string; userName: string; name?: string };
  listProduct: ImportReceiptItem[];
  totalAmount: number;
  status: ImportReceiptStatus;
  note?: string;
}
