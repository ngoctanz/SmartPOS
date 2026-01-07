"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import { BranchRevenue } from "@/service/dashboard.service"
import { Skeleton } from "@/components/ui/skeleton"

interface ChartRevenueByBranchProps {
  data: BranchRevenue[]
  loading?: boolean
}

const chartConfig = {
  totalRevenue: {
    label: "Doanh thu",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ChartRevenueByBranch({ data, loading }: ChartRevenueByBranchProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value)
  }

  const chartData = data.map(item => ({
    branch: item.branchName,
    revenue: item.totalRevenue,
    orders: item.totalOrders,
  }))

  if (loading) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-primary">Doanh thu theo chi nhánh</CardTitle>
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
        <CardTitle className="text-primary">Doanh thu theo chi nhánh</CardTitle>
        <CardDescription>Xếp hạng chi nhánh theo doanh thu bán hàng</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Chưa có dữ liệu
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="branch"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const dataItem = props.payload
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{dataItem.branch}</span>
                          <span>Doanh thu: {formatCurrency(dataItem.revenue)}</span>
                          <span>Số đơn: {dataItem.orders.toLocaleString('vi-VN')}</span>
                        </div>
                      )
                    }}
                    hideLabel
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-totalRevenue)" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
