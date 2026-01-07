import {
  IconCurrencyDollar,
  IconFileInvoice,
  IconPackage,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardsProps {
  stats?: {
    revenue: number;
    profit: number;
    productCount: number;
    orderCount: number;
  };
}

export function SectionCards({ stats }: SectionCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  const cards = [
    {
      title: "Tổng doanh thu",
      value: formatCurrency(stats?.revenue || 0),
      subtitle: "Tổng doanh thu hệ thống",
      icon: IconCurrencyDollar,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Tổng lợi nhuận",
      value: formatCurrency(stats?.profit || 0),
      subtitle: "Lợi nhuận từ đơn hàng",
      icon: IconTrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Sản phẩm tồn kho",
      value: formatNumber(stats?.productCount || 0),
      subtitle: "Số lượng trong kho",
      icon: IconPackage,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Số lượng hóa đơn",
      value: formatNumber(stats?.orderCount || 0),
      subtitle: "Tổng số hóa đơn đã xuất",
      icon: IconFileInvoice,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}
            >
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
