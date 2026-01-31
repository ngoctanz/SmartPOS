import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthSyncProvider } from "@/components/providers/auth-sync-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartPOS - Ứng dụng quản lý doanh thu gian hàng",
  description: "SmartPOS - Ứng dụng quản lý doanh thu gian hàng",
  icons: {
    icon: "/logo/smartpos-favicon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AuthSyncProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthSyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
