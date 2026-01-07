import { z } from "zod";

// Category Schema - Match BE
export const categorySchema = z.object({
  name: z
    .string({ required_error: "Tên loại sản phẩm là bắt buộc" })
    .min(2, "Tên loại sản phẩm phải có ít nhất 2 ký tự")
    .max(100, "Tên loại sản phẩm tối đa 100 ký tự")
    .trim(),
  desc: z.string().max(500, "Mô tả tối đa 500 ký tự").trim().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    desc: z.string().max(500).trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Phải có ít nhất một trường để cập nhật",
  });

export type CategoryFormData = z.infer<typeof categorySchema>;
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
