import { GalleryVerticalEnd } from "lucide-react";
import { LoginForm } from "@/components/forms/login.form";
import Image from "next/image";
import { PublicRoute } from "@/components/common/PublicRoute";

export default function LoginPage() {
  return (
    <PublicRoute>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10 z-10 bg-background relative">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] -z-10 bg-muted/10" />
          <div className="flex justify-center gap-2 md:justify-start">
            <a
              href="#"
              className="flex items-center gap-2 font-bold text-xl tracking-tight"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <GalleryVerticalEnd className="size-4" />
              </div>
              SmartPOS
            </a>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-[450px]">
              <LoginForm />
            </div>
          </div>
        </div>
        <div className="relative hidden bg-zinc-900 lg:block overflow-hidden">
          <Image
            src="/login-bg-premium.png"
            alt="Premium Retail Experience"
            fill
            className="object-cover transition-transform duration-700 hover:scale-105"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-10 text-white z-20">
            <blockquote className="space-y-4 max-w-lg">
              <p className="text-xl font-medium leading-relaxed tracking-wide">
                &ldquo;Giải pháp quản lý thông minh, nâng tầm trải nghiệm mua
                sắm cho khách hàng của bạn.&rdquo;
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="h-0.5 w-10 bg-primary/80"></div>
                <footer className="text-sm font-medium text-white/90 uppercase tracking-widest">
                  SmartPOS Future Retail
                </footer>
              </div>
            </blockquote>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
