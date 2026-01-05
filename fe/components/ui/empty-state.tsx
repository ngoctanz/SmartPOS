'use client';

import { ArrowLeft, Home, MessageCircle, PackageOpen, SearchX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { SHOP_INFO } from '@/constants/shop-info';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  mode?: 'custom' | 'out-of-stock' | 'search-not-found';
  onReset?: () => void;
  showContactButton?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className,
  mode = 'custom',
  onReset,
  showContactButton = false,
}: EmptyStateProps) {
  const router = useRouter();

  let defaultIcon = icon;
  let defaultTitle = title;
  let defaultDesc = description;
  let defaultActions = actions;

  if (mode === 'out-of-stock') {
    defaultIcon = icon || (
      <PackageOpen className="w-12 h-12 text-blue-500/60 dark:text-blue-400 group-hover:scale-110 transition-transform duration-500" />
    );
    defaultTitle = title || 'Hết hàng rồi!';
    defaultDesc = description || (
      <>
        Hiện tại không còn tài khoản nào trong gói này.
        <br className="hidden sm:block" />
        Vui lòng quay lại sau hoặc thử vận may ở gói khác nhé!
      </>
    );
    defaultActions = actions || (
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center justify-center">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-blue-500/25 w-full sm:w-auto"
        >
          <Home className="w-4 h-4" /> Về trang chủ
        </button>
        {showContactButton ? (
          <a
            href={SHOP_INFO.social.facebook.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-full font-bold text-sm transition-all border border-gray-200 dark:border-gray-700 hover:border-gray-300 w-full sm:w-auto"
          >
            <MessageCircle className="w-4 h-4" /> Liên hệ Admin
          </a>
        ) : (
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-full font-bold text-sm transition-all border border-gray-200 dark:border-gray-700 hover:border-gray-300 w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
        )}
      </div>
    );
  } else if (mode === 'search-not-found') {
    defaultIcon = icon || <SearchX className="w-10 h-10 text-gray-400" />;
    defaultTitle = title || 'Không tìm thấy kết quả';
    defaultDesc =
      description ||
      'Chúng tôi không tìm thấy tài khoản nào khớp với bộ lọc của bạn. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc.';
    defaultActions = actions || (
      <button
        onClick={onReset}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0"
      >
        Xóa bộ lọc & Thử lại
      </button>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm transition-all w-full select-none',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#444cf7_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        <div className="group w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-3xl flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-900 shadow-inner">
          {defaultIcon}
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {defaultTitle}
        </h2>

        <div className="text-gray-500 dark:text-gray-400 mb-8 text-base leading-relaxed max-w-sm mx-auto">
          {defaultDesc}
        </div>

        {defaultActions && <div className="w-full flex justify-center">{defaultActions}</div>}
      </div>
    </div>
  );
}
