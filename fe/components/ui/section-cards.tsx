import { IconCurrencyDollar, IconFileInvoice, IconPackage, IconTrendingUp } from '@tabler/icons-react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className='text-primary'>Tổng doanh thu</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats?.revenue || 0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Doanh thu bán hàng <IconCurrencyDollar className="size-4" />
          </div>
          <div className="text-muted-foreground">Tổng doanh thu hệ thống</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className='text-primary'>Tổng lợi nhuận</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats?.profit || 0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Lợi nhuận gộp <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Lợi nhuận từ đơn hàng</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className='text-primary'>Sản phẩm tồn kho</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats?.productCount || 0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Tổng sản phẩm <IconPackage className="size-4" />
          </div>
          <div className="text-muted-foreground">Số lượng trong kho</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className='text-primary'>Số lượng hóa đơn</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats?.orderCount || 0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Đơn hàng bán <IconFileInvoice className="size-4" />
          </div>
          <div className="text-muted-foreground">Tổng số hóa đơn đã xuất</div>
        </CardFooter>
      </Card>
    </div>
  );
}
