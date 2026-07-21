"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useState } from "react";
import { useLogin } from "@/hooks/useAuth";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { parseError } from "@/lib/error-handler";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth.schema";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [error, setError] = useState<{
    title?: string;
    message: string;
    suggestion?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      userName: "admin",
      password: "admin123",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data);
      reset();
    } catch (err) {
      const errorDetail = parseError(err);
      setError(errorDetail);
      console.error("Login error:", err);
    }
  };

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <div className="grid gap-6 px-8 py-20 border rounded-xl shadow-sm bg-card text-card-foreground">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Đăng nhập</h1>
          <p className="text-balance text-sm text-muted-foreground text-center">
            Chào mừng bạn quay trở lại hệ thống
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-5">
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    {error.title || "Lỗi đăng nhập"}
                  </p>
                  <p>{error.message}</p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <FieldLabel htmlFor="userName" className="text-sm font-medium">
                Tên đăng nhập
              </FieldLabel>
              <Input
                id="userName"
                placeholder="Ví dụ: admin"
                autoComplete="username"
                disabled={isSubmitting}
                className={cn(
                  "h-10",
                  errors.userName &&
                    "border-destructive focus-visible:ring-destructive"
                )}
                {...register("userName", { onChange: () => setError(null) })}
              />
              {errors.userName && (
                <p className="text-sm text-destructive">
                  {errors.userName.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <FieldLabel htmlFor="password" className="text-sm font-medium">
                Mật khẩu
              </FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className={cn(
                    "h-10 pr-10",
                    errors.password &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  {...register("password", { onChange: () => setError(null) })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Đăng nhập ngay
            </Button>
          </div>
        </form>
      </div>
      <div className="text-center text-sm text-muted-foreground flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border">
        <p className="font-medium text-foreground">
          ✨ Trải nghiệm hệ thống Web Demo SmartPOS
        </p>
        <p>
          Dự án được đóng góp và phát triển bởi <strong className="text-foreground">Ngọc Tân</strong>.
        </p>
        <p>
          Để trao đổi chi tiết về dự án hoặc cơ hội hợp tác, vui lòng liên hệ:
        </p>
        <a
          href="https://ngoctanz.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 mt-1 text-primary hover:text-primary/80 transition-colors font-semibold"
        >
          🌐 ngoctanz.tech
        </a>
      </div>
    </div>
  );
}
