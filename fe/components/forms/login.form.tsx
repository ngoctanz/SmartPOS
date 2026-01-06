"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
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
    clearErrors,
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl  text-primary">Đăng Nhập</CardTitle>
          <CardDescription>
            Nhập tên đăng nhập và mật khẩu của bạn để truy cập
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      {error.title && (
                        <p className="font-semibold text-sm text-destructive">
                          {error.title}
                        </p>
                      )}
                      <p className="text-sm text-destructive/90">
                        {error.message}
                      </p>
                      {error.suggestion && (
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 {error.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="userName">Tên đăng nhập</FieldLabel>
                <Input
                  id="userName"
                  type="text"
                  placeholder="username"
                  autoComplete="username"
                  aria-invalid={errors.userName ? "true" : "false"}
                  disabled={isSubmitting}
                  className={
                    errors.userName
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                  {...register("userName", {
                    onChange: () => setError(null),
                  })}
                />
                {errors.userName && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.userName.message}
                  </p>
                )}
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>

                  <Link
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-primary text-xs underline-offset-4 hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? "true" : "false"}
                  disabled={isSubmitting}
                  className={
                    errors.password
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                  {...register("password", {
                    onChange: () => setError(null),
                  })}
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.password.message}
                  </p>
                )}
              </Field>
              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Đăng Nhập
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-xs hidden lg:block sm:text-muted-foreground">
        Bằng cách tiếp tục, bạn đồng ý với{" "}
        <Link href="#" className="underline hover:text-primary">
          Điều khoản dịch vụ
        </Link>{" "}
        và{" "}
        <Link href="#" className="underline hover:text-primary">
          Chính sách bảo mật
        </Link>{" "}
        của chúng tôi.
      </FieldDescription>
    </div>
  );
}
