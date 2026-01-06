import { z } from "zod";

// User Schema - Match BE
export const createUserSchema = z.object({
  userName: z
    .string({ required_error: "Tên đăng nhập là bắt buộc" })
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(15, "Tên đăng nhập tối đa 15 ký tự")
    .trim(),
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .email("Email không hợp lệ")
    .trim(),
  password: z
    .string({ required_error: "Mật khẩu là bắt buộc" })
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(25, "Mật khẩu tối đa 25 ký tự")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{6,25}$/,
      "Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số, không có khoảng trắng"
    )
    .trim(),
});

export const updateUserSchema = z.object({
  email: z.string().email("Email không hợp lệ").trim().optional(),
  userName: z
    .string()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(15, "Tên đăng nhập tối đa 15 ký tự")
    .trim()
    .optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
