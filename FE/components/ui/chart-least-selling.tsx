"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { TopProduct } from "@/service/dashboard.service"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown } from "lucide-react"

interface ChartLeastSellingProductsProps {
  data: TopProduct[]
  loading?: boolean
  period?: string
}

const chartConfig = {
  totalQuantity: {
    label: "Số lượng bán",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const COLORS = [
  "hsl(var(--destructive))",
  "hsl(355 70% 55%)",
  "hsl(355 60% 60%)",
  "hsl(355 50% 65%)",
  "hsl(355 40% 70%)",
]

export function ChartLeastSellingProducts({ data, loading }: ChartLeastSellingProductsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value)
  }

  const chartData = data.map((item, index) => ({
    name: item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName,
    fullName: item.productName,
    quantity: item.totalQuantity,
    revenue: item.totalRevenue,
    fill: COLORS[index % COLORS.length],
  }))

  if (loading) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-primary">Top 10 sản phẩm bán ít nhất</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Top 10 sản phẩm bán ít nhất
          </span>
        </CardTitle>
        <CardDescription>Sản phẩm có số lượng bán thấp nhất (bao gồm cả sản phẩm không bán được), cần xem xét chiến lược</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Chưa có dữ liệu
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 10, right: 30 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name, props) => {
                      const data = props.payload
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{data.fullName}</span>
                          <span>Số lượng: {data.quantity.toLocaleString('vi-VN')}</span>
                          <span>Doanh thu: {formatCurrency(data.revenue)}</span>
                        </div>
                      )
                    }}
                    hideLabel
                  />
                }
              />
              <Bar dataKey="quantity" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
