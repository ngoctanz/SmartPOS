"use client";

import { useSocket } from "@/hooks/useSocket";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { playSuccessSound, speakPaymentSuccess } from "@/utils/audio";

export function GlobalSocketListener() {
  const pathname = usePathname();
  const router = useRouter();

  useSocket({
    enabled: true,
    onPaymentSuccess: (data) => {
      // Nếu đang ở trang tạo bill, để trang đó tự xử lý (tránh duplicate toast/sound)
      if (pathname === "/trang-quan-ly/hoa-don/tao-moi") {
        return;
      }

      // Ở các trang khác: Dashboard, Kho, ... -> Hiện thông báo
      playSuccessSound();
      speakPaymentSuccess(data.amount);

      toast.success(`Thanh toán thành công: ${data.receiptCode}`, {
        description: `Đã nhận: ${data.amount.toLocaleString("vi-VN")} đ`,
        duration: 5000,
        action: {
          label: "Xem",
          onClick: () =>
            router.push(`/trang-quan-ly/hoa-don/${data.receiptCode}`),
        },
      });
    },
  });

  return null; // Component này không render gì cả
}
