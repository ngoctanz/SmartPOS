import {
  IconCurrencyDollar,
  IconFileInvoice,
  IconPackage,
  IconShoppingCart,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSummary } from "@/service/dashboard.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSmartCurrency, formatNumber } from "@/utils/number.utils";

interface SectionCardsProps {
  stats?: DashboardSummary;
  loading?: boolean;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

const periodLabels: Record<string, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  "3month": "3 tháng",
  "6month": "6 tháng",
  year: "Năm nay",
};

export function SectionCards({ stats, loading, period = "month", onPeriodChange }: SectionCardsProps) {
  const periodLabel = periodLabels[period] || "Tháng này";

  const cards = [
    {
      title: "Tổng doanh thu",
      value: formatSmartCurrency(stats?.revenue || 0),
      subtitle: `Doanh thu ${periodLabel.toLowerCase()}`,
      icon: IconCurrencyDollar,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Số lượng hóa đơn",
      value: formatNumber(stats?.totalOrders || 0),
      subtitle: `Hóa đơn ${periodLabel.toLowerCase()}`,
      icon: IconFileInvoice,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Chi phí nhập hàng",
      value: formatSmartCurrency(stats?.totalImportCost || 0),
      subtitle: `${formatNumber(stats?.totalImportReceipts || 0)} phiếu nhập ${periodLabel.toLowerCase()}`,
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
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Tổng quan</h2>
        {onPeriodChange && (
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Chọn kỳ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hôm nay</SelectItem>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="3month">3 tháng</SelectItem>
              <SelectItem value="6month">6 tháng</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index} className="@container/card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground text-primary">
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
    </div>
  );
}
