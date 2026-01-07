"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", revenue: 2220, profit: 1500 },
  { date: "2024-04-02", revenue: 970, profit: 180 },
  { date: "2024-04-03", revenue: 1670, profit: 1200 },
  { date: "2024-04-04", revenue: 2420, profit: 260 },
  { date: "2024-04-05", revenue: 3730, profit: 2900 },
  { date: "2024-04-06", revenue: 3010, profit: 340 },
  { date: "2024-04-07", revenue: 2450, profit: 1800 },
  { date: "2024-04-08", revenue: 4090, profit: 3200 },
  { date: "2024-04-09", revenue: 590, profit: 110 },
  { date: "2024-04-10", revenue: 2610, profit: 1900 },
  { date: "2024-04-11", revenue: 3270, profit: 350 },
  { date: "2024-04-12", revenue: 2920, profit: 2100 },
  { date: "2024-04-13", revenue: 3420, profit: 3800 },
  { date: "2024-04-14", revenue: 1370, profit: 220 },
  { date: "2024-04-15", revenue: 1200, profit: 1700 },
  { date: "2024-04-16", revenue: 1380, profit: 190 },
  { date: "2024-04-17", revenue: 4460, profit: 3600 },
  { date: "2024-04-18", revenue: 3640, profit: 4100 },
  { date: "2024-04-19", revenue: 2430, profit: 180 },
  { date: "2024-04-20", revenue: 890, profit: 150 },
  { date: "2024-04-21", revenue: 1370, profit: 200 },
  { date: "2024-04-22", revenue: 2240, profit: 170 },
  { date: "2024-04-23", revenue: 1380, profit: 230 },
  { date: "2024-04-24", revenue: 3870, profit: 290 },
  { date: "2024-04-25", revenue: 2150, profit: 250 },
  { date: "2024-04-26", revenue: 750, profit: 130 },
  { date: "2024-04-27", revenue: 3830, profit: 420 },
  { date: "2024-04-28", revenue: 1220, profit: 180 },
  { date: "2024-04-29", revenue: 3150, profit: 240 },
  { date: "2024-04-30", revenue: 4540, profit: 380 },
  { date: "2024-05-01", revenue: 1650, profit: 220 },
  { date: "2024-05-02", revenue: 2930, profit: 310 },
  { date: "2024-05-03", revenue: 2470, profit: 190 },
  { date: "2024-05-04", revenue: 3850, profit: 420 },
  { date: "2024-05-05", revenue: 4810, profit: 390 },
  { date: "2024-05-06", revenue: 4980, profit: 520 },
  { date: "2024-05-07", revenue: 3880, profit: 300 },
  { date: "2024-05-08", revenue: 1490, profit: 210 },
  { date: "2024-05-09", revenue: 2270, profit: 180 },
  { date: "2024-05-10", revenue: 2930, profit: 330 },
  { date: "2024-05-11", revenue: 3350, profit: 270 },
  { date: "2024-05-12", revenue: 1970, profit: 240 },
  { date: "2024-05-13", revenue: 1970, profit: 160 },
  { date: "2024-05-14", revenue: 4480, profit: 490 },
  { date: "2024-05-15", revenue: 4730, profit: 380 },
  { date: "2024-05-16", revenue: 3380, profit: 400 },
  { date: "2024-05-17", revenue: 4990, profit: 420 },
  { date: "2024-05-18", revenue: 3150, profit: 350 },
  { date: "2024-05-19", revenue: 2350, profit: 180 },
  { date: "2024-05-20", revenue: 1770, profit: 230 },
  { date: "2024-05-21", revenue: 820, profit: 140 },
  { date: "2024-05-22", revenue: 810, profit: 120 },
  { date: "2024-05-23", revenue: 2520, profit: 290 },
  { date: "2024-05-24", revenue: 2940, profit: 220 },
  { date: "2024-05-25", revenue: 2010, profit: 250 },
  { date: "2024-05-26", revenue: 2130, profit: 170 },
  { date: "2024-05-27", revenue: 4200, profit: 460 },
  { date: "2024-05-28", revenue: 2330, profit: 190 },
  { date: "2024-05-29", revenue: 780, profit: 130 },
  { date: "2024-05-30", revenue: 3400, profit: 280 },
  { date: "2024-05-31", revenue: 1780, profit: 230 },
  { date: "2024-06-01", revenue: 1780, profit: 200 },
  { date: "2024-06-02", revenue: 4700, profit: 410 },
  { date: "2024-06-03", revenue: 1030, profit: 160 },
  { date: "2024-06-04", revenue: 4390, profit: 380 },
  { date: "2024-06-05", revenue: 880, profit: 140 },
  { date: "2024-06-06", revenue: 2940, profit: 250 },
  { date: "2024-06-07", revenue: 3230, profit: 370 },
  { date: "2024-06-08", revenue: 3850, profit: 320 },
  { date: "2024-06-09", revenue: 4380, profit: 480 },
  { date: "2024-06-10", revenue: 1550, profit: 200 },
  { date: "2024-06-11", revenue: 920, profit: 150 },
  { date: "2024-06-12", revenue: 4920, profit: 420 },
  { date: "2024-06-13", revenue: 810, profit: 130 },
  { date: "2024-06-14", revenue: 4260, profit: 380 },
  { date: "2024-06-15", revenue: 3070, profit: 350 },
  { date: "2024-06-16", revenue: 3710, profit: 310 },
  { date: "2024-06-17", revenue: 4750, profit: 520 },
  { date: "2024-06-18", revenue: 1070, profit: 170 },
  { date: "2024-06-19", revenue: 3410, profit: 290 },
  { date: "2024-06-20", revenue: 4080, profit: 450 },
  { date: "2024-06-21", revenue: 1690, profit: 210 },
  { date: "2024-06-22", revenue: 3170, profit: 270 },
  { date: "2024-06-23", revenue: 4800, profit: 530 },
  { date: "2024-06-24", revenue: 1320, profit: 180 },
  { date: "2024-06-25", revenue: 1410, profit: 190 },
  { date: "2024-06-26", revenue: 4340, profit: 380 },
  { date: "2024-06-27", revenue: 4480, profit: 490 },
  { date: "2024-06-28", revenue: 1490, profit: 200 },
  { date: "2024-06-29", revenue: 1030, profit: 160 },
  { date: "2024-06-30", revenue: 4460, profit: 400 },
]

const chartConfig = {
  view: {
    label: "Chi tiết",
  },
  revenue: {
    label: "Doanh thu",
    color: "var(--primary)",
  },
  profit: {
    label: "Lợi nhuận",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="text-primary">Doanh thu & Lợi nhuận</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Báo cáo doanh thu và lợi nhuận 3 tháng qua
          </span>
          <span className="@[540px]/card:hidden">3 tháng qua</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 tháng qua</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 ngày qua</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 ngày qua</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="3 tháng qua" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                3 tháng qua
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 ngày qua
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 ngày qua
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
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
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-profit)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-profit)"
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
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("vi-VN", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="profit"
              type="natural"
              fill="url(#fillProfit)"
              stroke="var(--color-profit)"
              stackId="a"
            />
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#fillRevenue)"
              stroke="var(--color-revenue)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
