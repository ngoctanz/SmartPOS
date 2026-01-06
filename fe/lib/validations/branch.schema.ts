import { z } from "zod";

// Branch Schema - Match BE
export const branchSchema = z.object({
  branchName: z
    .string({ required_error: "Tên chi nhánh là bắt buộc" })
    .min(2, "Tên chi nhánh phải có ít nhất 2 ký tự")
    .max(200, "Tên chi nhánh tối đa 200 ký tự")
    .trim(),
  address: z
    .string({ required_error: "Địa chỉ là bắt buộc" })
    .max(500, "Địa chỉ tối đa 500 ký tự")
    .trim(),
  contactInfo: z
    .string()
    .max(200, "Thông tin liên hệ tối đa 200 ký tự")
    .trim()
    .optional(),
});

export const updateBranchSchema = z
  .object({
    branchName: z
      .string()
      .min(2, "Tên chi nhánh phải có ít nhất 2 ký tự")
      .max(200)
      .trim()
      .optional(),
    address: z.string().max(500, "Địa chỉ tối đa 500 ký tự").trim().optional(),
    contactInfo: z
      .string()
      .max(200, "Thông tin liên hệ tối đa 200 ký tự")
      .trim()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Phải có ít nhất một trường để cập nhật",
  });

export type BranchFormData = z.infer<typeof branchSchema>;
export type UpdateBranchFormData = z.infer<typeof updateBranchSchema>;
