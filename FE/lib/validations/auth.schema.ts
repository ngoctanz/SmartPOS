import { z } from "zod";

// Login Schema - Match BE
export const loginSchema = z.object({
  userName: z
    .string({ required_error: "Tên đăng nhập là bắt buộc" })
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(15, "Tên đăng nhập tối đa 15 ký tự")
    .trim(),
  password: z
    .string({ required_error: "Mật khẩu là bắt buộc" })
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(25, "Mật khẩu tối đa 25 ký tự")
    .trim(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register Schema (for future use)
export const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: "Họ tên là bắt buộc" })
      .min(2, "Họ tên phải có ít nhất 2 ký tự")
      .max(100, "Họ tên quá dài")
      .trim(),
    email: z
      .string({ required_error: "Email là bắt buộc" })
      .min(1, "Vui lòng nhập email")
      .email("Email không hợp lệ")
      .max(255, "Email quá dài")
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: "Mật khẩu là bắt buộc" })
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .max(100, "Mật khẩu quá dài")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Mật khẩu phải chứa chữ hoa, chữ thường và số"
      ),
    confirmPassword: z
      .string({ required_error: "Vui lòng xác nhận mật khẩu" })
      .min(1, "Vui lòng xác nhận mật khẩu"),
    role: z.enum(["admin", "manager", "staff"], {
      required_error: "Vui lòng chọn vai trò",
    }),
    branchId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      // If role is staff or manager, branchId is required
      if (data.role === "staff" || data.role === "manager") {
        return !!data.branchId;
      }
      return true;
    },
    {
      message: "Chi nhánh là bắt buộc cho vai trò này",
      path: ["branchId"],
    }
  );

export type RegisterFormData = z.infer<typeof registerSchema>;

// Change Password Schema
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Mật khẩu hiện tại là bắt buộc" })
      .min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string({ required_error: "Mật khẩu mới là bắt buộc" })
      .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
      .max(100, "Mật khẩu quá dài")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Mật khẩu phải chứa chữ hoa, chữ thường và số"
      ),
    confirmNewPassword: z
      .string({ required_error: "Vui lòng xác nhận mật khẩu mới" })
      .min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset Password Schema
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token không hợp lệ"),
    password: z
      .string({ required_error: "Mật khẩu là bắt buộc" })
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .max(100, "Mật khẩu quá dài")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Mật khẩu phải chứa chữ hoa, chữ thường và số"
      ),
    confirmPassword: z
      .string({ required_error: "Vui lòng xác nhận mật khẩu" })
      .min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
