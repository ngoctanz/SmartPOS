"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useState } from "react";
import { useLogin } from "@/hooks/useAuth";
import { Loader2, AlertCircle } from "lucide-react";
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
      userName: "",
      password: "",
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
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isSubmitting}
                className={cn(
                  "h-10",
                  errors.password &&
                    "border-destructive focus-visible:ring-destructive"
                )}
                {...register("password", { onChange: () => setError(null) })}
              />
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
      <div className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <a
          href="#"
          className="underline underline-offset-4 hover:text-primary font-medium"
        >
          Liên hệ quản trị viên
        </a>
      </div>
    </div>
  );
}
