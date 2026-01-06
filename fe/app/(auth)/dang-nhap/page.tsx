import { GalleryVerticalEnd } from "lucide-react";
import { LoginForm } from "@/components/forms/login.form";
import Image from "next/image";
import { PublicRoute } from "@/components/common/PublicRoute";

export default function LoginPage() {
  return (
    <PublicRoute>
      <div className="relative min-h-svh w-full">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/background.png"
            alt="Background"
            fill
            className="object-cover object-bottom lg:object-fill"
            priority
          />
        </div>
        <div className="relative z-10 flex min-h-svh flex-col p-6 md:p-10 lg:pl-20">
          <div className="flex items-center justify-start">
            <Image
              src="/logo/KiotViet-Logo-Horizontal.svg"
              alt="KiotViet"
              width={160}
              height={50}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="flex w-full max-w-sm flex-col gap-6">
              <a
                href="#"
                className="flex items-center gap-2 self-start font-medium text-primary"
              >
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                SmartPOS
              </a>
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
