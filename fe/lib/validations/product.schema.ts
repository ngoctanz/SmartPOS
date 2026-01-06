import { z } from "zod";

// Product Schema - Match BE
export const productSchema = z.object({
  categoryId: z
    .string({ required_error: "Loại sản phẩm là bắt buộc" })
    .length(24, "ID loại sản phẩm không hợp lệ"),
  name: z
    .string({ required_error: "Tên sản phẩm là bắt buộc" })
    .min(2, "Tên sản phẩm phải có ít nhất 2 ký tự")
    .max(200, "Tên sản phẩm tối đa 200 ký tự")
    .trim(),
  desc: z.string().max(1000, "Mô tả tối đa 1000 ký tự").trim().optional(),
  barcode: z.string().trim().optional(),
  unit: z.string({ required_error: "Đơn vị tính là bắt buộc" }).trim(),
  image: z.string().trim().optional(),
  currentSalePrice: z
    .number({ required_error: "Giá bán là bắt buộc" })
    .min(0, "Giá bán phải lớn hơn hoặc bằng 0"),
});

export const updateProductSchema = z
  .object({
    categoryId: z
      .string()
      .length(24, "ID loại sản phẩm không hợp lệ")
      .optional(),
    name: z.string().min(2).max(200).trim().optional(),
    desc: z.string().max(1000).trim().optional(),
    barcode: z.string().trim().optional(),
    unit: z.string().trim().optional(),
    image: z.string().trim().optional(),
    currentSalePrice: z.number().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Phải có ít nhất một trường để cập nhật",
  });

export const updatePriceSchema = z.object({
  salePrice: z
    .number({ required_error: "Giá bán là bắt buộc" })
    .min(0, "Giá bán phải lớn hơn hoặc bằng 0"),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
export type UpdatePriceFormData = z.infer<typeof updatePriceSchema>;
