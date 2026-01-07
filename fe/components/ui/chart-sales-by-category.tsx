"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

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
import { CategorySales } from "@/service/dashboard.service"
import { Skeleton } from "@/components/ui/skeleton"

interface ChartSalesByCategoryProps {
  data: CategorySales[]
  loading?: boolean
}

const COLORS = [  
 "#0a73ff",  // màu gốc
"#3b8fff",  // nhạt ~20%
"#6cabff",  // nhạt ~40%
"#9dc7ff",  // nhạt ~60%
"#cee3ff",  // nhạt ~80%
]

export function ChartSalesByCategory({ data, loading }: ChartSalesByCategoryProps) {
  // Filter only categories with revenue > 0
  const filteredData = data.filter(item => item.totalRevenue > 0)
  
  const chartData = filteredData.map((item, index) => ({
    name: item.categoryName,
    value: item.totalRevenue,
    quantity: item.totalQuantity,
    fill: COLORS[index % COLORS.length],
  }))

  const totalRevenue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [chartData])

  const chartConfig: ChartConfig = {
    value: {
      label: "Doanh thu",
    },
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND', 
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const renderCustomLabel = (entry: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name } = entry
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-semibold text-base"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
      >
        {name}
      </text>
    )
  }

  if (loading) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-primary">Thống kê theo loại sản phẩm</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <Skeleton className="mx-auto aspect-square max-h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-primary">Thống kê theo loại sản phẩm</CardTitle>
        <CardDescription>Doanh thu theo từng danh mục sản phẩm</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Chưa có dữ liệu bán hàng
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const item = props.payload
                      return (
                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                          <span className="font-bold text-base">{item.name}</span>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-sm">Số lượng:</span>
                            <span className="font-semibold">{item.quantity.toLocaleString('vi-VN')}</span>
                          </div>
                          <div className="flex justify-between items-center gap-3 pt-1 border-t">
                            <span className="text-muted-foreground text-sm">Doanh thu:</span>
                            <span className="font-bold text-primary">{formatCurrency(item.value)}</span>
                          </div>
                        </div>
                      )
                    }}
                    hideLabel
                  />
                }
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
