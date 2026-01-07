import { z } from "zod";

// Receipt Item Schema - Match BE (listProduct)
export const receiptItemSchema = z.object({
  productId: z
    .string({ required_error: "Sản phẩm là bắt buộc" })
    .length(24, "ID sản phẩm không hợp lệ"),
  quantity: z
    .number({ required_error: "Số lượng là bắt buộc" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng phải lớn hơn 0"),
  salePrice: z.number().min(0, "Giá bán phải lớn hơn hoặc bằng 0").optional(), // Custom price optional
});

// Receipt Schema - Match BE
export const receiptSchema = z.object({
  branchId: z
    .string({ required_error: "Chi nhánh là bắt buộc" })
    .length(24, "ID chi nhánh không hợp lệ"),
  listProduct: z
    .array(receiptItemSchema, {
      required_error: "Danh sách sản phẩm là bắt buộc",
    })
    .min(1, "Phải có ít nhất 1 sản phẩm"),
  paymentMethod: z
    .enum(["cash", "card", "transfer"], {
      required_error: "Phương thức thanh toán là bắt buộc",
    })
    .default("cash"),
});

// Import Receipt Item Schema - Match BE
export const importReceiptItemSchema = z.object({
  productId: z
    .string({ required_error: "Sản phẩm là bắt buộc" })
    .length(24, "ID sản phẩm không hợp lệ"),
  quantity: z
    .number({ required_error: "Số lượng là bắt buộc" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng phải lớn hơn 0"),
  importPrice: z
    .number({ required_error: "Giá nhập là bắt buộc" })
    .min(0, "Giá nhập phải lớn hơn hoặc bằng 0"),
});

// Import Receipt Schema - Match BE
export const importReceiptSchema = z.object({
  branchId: z
    .string({ required_error: "Chi nhánh là bắt buộc" })
    .length(24, "ID chi nhánh không hợp lệ"),
  supplierName: z
    .string()
    .max(200, "Tên nhà cung cấp tối đa 200 ký tự")
    .trim()
    .optional(),
  listProduct: z
    .array(importReceiptItemSchema, {
      required_error: "Danh sách sản phẩm là bắt buộc",
    })
    .min(1, "Phải có ít nhất 1 sản phẩm"),
  note: z.string().max(500, "Ghi chú tối đa 500 ký tự").trim().optional(),
});

export type ReceiptItemFormData = z.infer<typeof receiptItemSchema>;
export type ReceiptFormData = z.infer<typeof receiptSchema>;
export type ImportReceiptItemFormData = z.infer<typeof importReceiptItemSchema>;
export type ImportReceiptFormData = z.infer<typeof importReceiptSchema>;
