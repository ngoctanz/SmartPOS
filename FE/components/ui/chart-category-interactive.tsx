"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartData = [
  { category: "Điện thoại", visitors: 275, fill: "var(--color-cat1)" },
  { category: "Laptop", visitors: 200, fill: "var(--color-cat2)" },
  { category: "Phụ kiện", visitors: 187, fill: "var(--color-cat3)" },
  { category: "Tablet", visitors: 173, fill: "var(--color-cat4)" },
  { category: "Khác", visitors: 90, fill: "var(--color-cat5)" },
]

const chartConfig = {
  visitors: {
    label: "Sản phẩm",
  },
  cat1: {
    label: "Điện thoại",
    color: "var(--chart-1)",
  },
  cat2: {
    label: "Laptop",
    color: "var(--chart-2)",
  },
  cat3: {
    label: "Phụ kiện",
    color: "var(--chart-3)",
  },
  cat4: {
    label: "Tablet",
    color: "var(--chart-4)",
  },
  cat5: {
    label: "Khác",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

export function ChartCategoryInteractive() {
  const totalVisitors = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [])

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-primary">Phân bố sản phẩm</CardTitle>
        <CardDescription>Theo danh mục sản phẩm</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="category"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalVisitors.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Sản phẩm
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
