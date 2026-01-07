"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Label, Pie, PieChart, Bar, BarChart, XAxis, YAxis } from "recharts";
import productService, { Product } from "@/service/product.service";
import { Category } from "@/service/category.service";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Tags,
  BarChart3,
} from "lucide-react";
import { StatsCard } from "@/components/common/stats-card";
import { useMemo, useState, useEffect } from "react";

interface ProductStatsProps {
  products: Product[];
  categories: Category[];
}

export function ProductStats({ products, categories }: ProductStatsProps) {
  // State for stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await productService.getStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch product stats:", error);
      }
    };
    fetchStats();
  }, []);

  // Calculate chart data from products prop (still needed for charts as API only returns summary)
  const chartStats = useMemo(() => {
    // Count products by category
    const categoryCount = categories.map((cat) => {
      const count = products.filter((p) => {
        if (!p.categoryId) return false;
        const catId =
          typeof p.categoryId === "object" ? p.categoryId._id : p.categoryId;
        return catId === cat._id;
      }).length;
      return {
        name: cat.name,
        value: count,
      };
    });

    // Sort by count descending and take top 5
    const topCategories = [...categoryCount]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      categoryCount,
      topCategories,
    };
  }, [products, categories]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    return chartStats.topCategories.map((cat, idx) => ({
      category: cat.name,
      value: cat.value,
      fill: colors[idx % colors.length],
    }));
  }, [chartStats.topCategories]);

  const pieChartConfig = useMemo(() => {
    const config: ChartConfig = {
      value: { label: "Sản phẩm" },
    };
    chartStats.topCategories.forEach((cat, idx) => {
      config[`cat${idx + 1}`] = {
        label: cat.name,
        color: `var(--chart-${idx + 1})`,
      };
    });
    return config;
  }, [chartStats.topCategories]);

  // Bar chart data (status distribution)
  const barChartData = [
    { name: "Đang bán", value: stats.active, fill: "var(--chart-1)" },
    {
      name: "Ngừng bán",
      value: stats.inactive,
      fill: "var(--chart-3)",
    },
  ];

  const barChartConfig: ChartConfig = {
    value: { label: "Số lượng" },
    active: { label: "Đang bán", color: "var(--chart-1)" },
    inactive: { label: "Ngừng bán", color: "var(--chart-3)" },
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      {/* Total Products */}
      <StatsCard
        title="Tổng sản phẩm"
        value={stats.total}
        icon={Package}
        description={`${stats.active} đang bán`}
      />

      {/* Active Products */}
      <StatsCard
        title="Đang bán"
        value={stats.active}
        icon={TrendingUp}
        className="text-emerald-600"
        description={`${
            stats.total > 0
            ? Math.round((stats.active / stats.total) * 100)
            : 0
        }% tổng sản phẩm`}
      />

      {/* Inactive Products */}
      <StatsCard
        title="Ngừng bán"
        value={stats.inactive}
        icon={AlertTriangle}
        className="text-amber-600"
        description={`${
            stats.total > 0
            ? Math.round((stats.inactive / stats.total) * 100)
            : 0
        }% tổng sản phẩm`}
      />

      {/* Categories */}
      <StatsCard
        title="Danh mục"
        value={categories.length}
        icon={Tags}
        description={`Top: ${chartStats.topCategories[0]?.name || "N/A"}`}
      />

      {/* Pie Chart - Products by Category */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Phân bố theo danh mục
          </CardTitle>
          <CardDescription>
            Top 5 danh mục có nhiều sản phẩm nhất
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieChartData.length > 0 ? (
            <ChartContainer
              config={pieChartConfig}
              className="mx-auto aspect-square max-h-[200px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={50}
                  strokeWidth={3}
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
                              className="fill-foreground text-2xl font-bold"
                            >
                              {stats.total}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 20}
                              className="fill-muted-foreground text-xs"
                            >
                              Sản phẩm
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Không có dữ liệu
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart - Status Distribution */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trạng thái sản phẩm
          </CardTitle>
          <CardDescription>Phân bố theo trạng thái bán hàng</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="h-[200px] w-full">
            <BarChart data={barChartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
