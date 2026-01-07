import {
  IconCurrencyDollar,
  IconFileInvoice,
  IconPackage,
  IconShoppingCart,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSummary } from "@/service/dashboard.service";

interface SectionCardsProps {
  stats?: DashboardSummary;
  loading?: boolean;
}

export function SectionCards({ stats, loading }: SectionCardsProps) {
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
      subtitle: "Doanh thu từ hóa đơn hoàn thành",
      icon: IconCurrencyDollar,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Số lượng hóa đơn",
      value: formatNumber(stats?.totalOrders || 0),
      subtitle: "Tổng số hóa đơn đã xuất",
      icon: IconFileInvoice,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Chi phí nhập hàng",
      value: formatCurrency(stats?.totalImportCost || 0),
      subtitle: `${formatNumber(stats?.totalImportReceipts || 0)} phiếu nhập`,
      icon: IconShoppingCart,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Tổng sản phẩm",
      value: formatNumber(stats?.totalProducts || 0),
      subtitle: "Số lượng sản phẩm trong hệ thống",
      icon: IconPackage,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="@container/card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
