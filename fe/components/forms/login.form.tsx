"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl  text-primary">Đăng Nhập</CardTitle>
          <CardDescription>
            Nhập email và mật khẩu của bạn để truy cập
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  required
                />
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
                  type="text"
                  placeholder="Nhập mật khẩu"
                  required
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full">
                  Đăng Nhập
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-xs hidden lg:block sm:text-muted-foreground">
        Bằng cách tiếp tục, bạn đồng ý với <Link href="#" className="underline hover:text-primary">Điều khoản dịch vụ</Link>{" "}
        và <Link href="#" className="underline hover:text-primary">Chính sách bảo mật</Link> của chúng tôi.
      </FieldDescription>
    </div>
  )
}
