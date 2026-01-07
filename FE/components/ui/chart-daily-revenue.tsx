"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { DailyStats } from "@/service/dashboard.service"
import { Skeleton } from "@/components/ui/skeleton"

interface ChartDailyRevenueProps {
  data: DailyStats[]
  loading?: boolean
  period: string
  onPeriodChange: (period: string) => void
}

const chartConfig = {
  revenue: {
    label: "Doanh thu",
    color: "var(--primary)",
  },
  orders: {
    label: "Số đơn",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartDailyRevenue({ data, loading, period, onPeriodChange }: ChartDailyRevenueProps) {
  const isMobile = useIsMobile()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value)
  }

  const chartData = data.map(item => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders,
  }))

  const getPeriodLabel = () => {
    switch (period) {
      case "week": return "tuần này"
      case "month": return "tháng này"
      case "3month": return "3 tháng qua"
      case "6month": return "6 tháng qua"
      case "year": return "năm nay"
      default: return "tháng này"
    }
  }

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="text-primary">Doanh thu theo thời gian</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="text-primary">Doanh thu theo thời gian</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Báo cáo doanh thu {getPeriodLabel()}
          </span>
          <span className="@[540px]/card:hidden">{getPeriodLabel()}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(value) => value && onPeriodChange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="month">Tháng này</ToggleGroupItem>
            <ToggleGroupItem value="3month">3 tháng</ToggleGroupItem>
            <ToggleGroupItem value="6month">6 tháng</ToggleGroupItem>
          </ToggleGroup>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Tháng này" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="month" className="rounded-lg">
                Tháng này
              </SelectItem>
              <SelectItem value="3month" className="rounded-lg">
                3 tháng
              </SelectItem>
              <SelectItem value="6month" className="rounded-lg">
                6 tháng
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Chưa có dữ liệu
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("vi-VN", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }}
                    formatter={(value, name) => {
                      if (name === "revenue") {
                        return <span>Doanh thu: {formatCurrency(value as number)}</span>
                      }
                      return <span>Số đơn: {(value as number).toLocaleString('vi-VN')}</span>
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
