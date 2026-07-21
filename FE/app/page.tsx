import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, Store, LayoutDashboard, ScanLine, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafc] dark:bg-zinc-950 font-sans overflow-x-hidden text-slate-800 dark:text-slate-200">
      
      {/* Soft Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-indigo-400/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-cyan-400/20 blur-[120px]" />
      </div>

      {/* Navbar */}
      <header className="fixed top-0 z-50 w-full bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl border-b border-white/20 dark:border-white/5 transition-all">
        <div className="container mx-auto flex h-[72px] items-center justify-between px-6 lg:px-12">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image 
              src="/logo/smartpos-logo.png" 
              alt="SmartPOS Logo" 
              width={160} 
              height={40} 
              className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
              priority
            />
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="https://ngoctanz.tech"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden md:block"
            >
              Về Tác Giả
            </Link>
            <Link href="/dang-nhap">
              <Button className="rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all border-0">
                Trải nghiệm <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center w-full pt-[100px]">
        {/* Hero Section */}
        <section className="w-full py-20 lg:py-28">
          <div className="container mx-auto px-6 lg:px-12 text-center flex flex-col items-center">
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-8 max-w-5xl">
              Nâng tầm quản lý với <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                SmartPOS Toàn Diện
              </span>
            </h1>
            
            <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl font-medium leading-relaxed">
              Trải nghiệm hệ thống quản lý bán hàng mượt mà, giao diện tối giản và công cụ phân tích sắc bén dành riêng cho cửa hàng của bạn.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto justify-center">
              <Link href="/dang-nhap" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-base rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-xl hover:-translate-y-1 transition-all group">
                  Đăng nhập hệ thống
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Floating Hero Image */}
            <div className="relative w-full max-w-5xl mx-auto group">
              <div className="absolute -inset-4 md:-inset-8 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative rounded-3xl md:rounded-[2.5rem] bg-white/40 dark:bg-zinc-900/40 p-2 md:p-4 shadow-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 transition-transform duration-700 ease-out hover:-translate-y-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-zinc-900">
                  <Image 
                    src="/images/noibo.png" 
                    alt="SmartPOS Dashboard" 
                    width={1400} 
                    height={900}
                    className="w-full h-auto object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition & Visual Showcase */}
        <section className="w-full py-24 md:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              {/* Image Show */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image 
                  src="/images/login-bg-premium.png" 
                  alt="Premium POS Experience" 
                  width={800} 
                  height={800}
                  className="w-full h-[500px] object-cover scale-105 hover:scale-100 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                  <h3 className="text-2xl font-bold mb-2">Trải nghiệm thị giác</h3>
                  <p className="text-white/80">Thiết kế tinh tế mang lại cảm giác thoải mái cho nhân viên xuyên suốt ngày dài làm việc.</p>
                </div>
              </div>

              {/* Text Info */}
              <div className="flex flex-col gap-12">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">Thiết kế liền mạch</h2>
                  <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">Mọi chức năng được sắp xếp gọn gàng, loại bỏ những thao tác rườm rà. Tập trung tối đa vào tốc độ thanh toán và phục vụ khách hàng.</p>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <LayoutDashboard strokeWidth={1.5} />
                    </div>
                    <h4 className="text-xl font-bold">Giao diện rộng rãi</h4>
                    <p className="text-slate-600 dark:text-slate-400">Tận dụng tối đa không gian màn hình, dễ nhìn, dễ thao tác.</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                      <ScanLine strokeWidth={1.5} />
                    </div>
                    <h4 className="text-xl font-bold">Quét mã siêu nhạy</h4>
                    <p className="text-slate-600 dark:text-slate-400">Xử lý hàng loạt sản phẩm trong tích tắc, in bill tự động.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="w-full py-24 bg-white/50 dark:bg-zinc-900/50 border-y border-slate-200 dark:border-slate-800">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">Kiểm soát mọi thứ</h2>
              <p className="text-slate-600 dark:text-slate-400 text-xl">Bộ công cụ đắc lực giúp bạn đưa ra những quyết định kinh doanh chính xác.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Big Card */}
              <div className="md:col-span-2 p-8 rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                <PieChart className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-6" strokeWidth={1.5} />
                <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Báo cáo trực quan</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">Doanh thu, lợi nhuận, chi phí được biểu diễn bằng biểu đồ sinh động. Dữ liệu được cập nhật liên tục theo thời gian thực (Real-time).</p>
              </div>
              
              {/* Small Card */}
              <div className="p-8 rounded-[2rem] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all">
                <Store className="w-12 h-12 text-slate-800 dark:text-slate-200 mb-6" strokeWidth={1.5} />
                <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Đa chi nhánh</h3>
                <p className="text-slate-600 dark:text-slate-400">Quản lý đồng thời nhiều cửa hàng, luân chuyển kho bãi dễ dàng với một tài khoản quản trị duy nhất.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-32 relative overflow-hidden">
          <div className="container relative mx-auto px-6 text-center max-w-3xl z-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-slate-900 dark:text-white">Khám phá ngay</h2>
            <p className="text-slate-600 dark:text-slate-400 text-xl font-medium mb-12">
              Chỉ một cú nhấp chuột để trải nghiệm trực tiếp hệ thống SmartPOS.
            </p>
            <Link href="/dang-nhap">
              <Button size="lg" className="h-16 px-12 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:scale-105 transition-all border-0">
                Đăng Nhập <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 py-12">
        <div className="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo/smartpos-logo.png" 
              alt="SmartPOS Logo" 
              width={120} 
              height={30} 
              className="h-7 w-auto object-contain dark:brightness-0 dark:invert opacity-70 hover:opacity-100 transition-opacity"
            />
          </div>
          <p className="text-sm font-medium text-slate-500">© {new Date().getFullYear()} Designed & Developed by <strong className="text-slate-900 dark:text-white">Ngọc Tân</strong>.</p>
          <Link href="https://ngoctanz.tech" target="_blank" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-semibold underline underline-offset-4 text-slate-500">
            ngoctanz.tech
          </Link>
        </div>
      </footer>
    </div>
  );
}
