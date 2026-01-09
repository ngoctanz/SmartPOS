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

  const [categoryStats, setCategoryStats] = useState<Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, categoryStatsRes] = await Promise.all([
          productService.getStats(),
          productService.getCategoryStats(),
        ]);
        
        if (statsRes.data) {
          setStats(statsRes.data);
        }
        
        if (categoryStatsRes.data) {
          setCategoryStats(categoryStatsRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch product stats:", error);
      }
    };
    fetchStats();
  }, []);

  // Calculate chart data from API stats
  const chartStats = useMemo(() => {
    // Sort by count descending and take top 5
    const topCategories = [...categoryStats]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      categoryCount: categoryStats,
      topCategories: topCategories.map(cat => ({
        name: cat.categoryName,
        value: cat.count,
      })),
    };
  }, [categoryStats]);

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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
      {/* Total Products */}
      <StatsCard
        title="Tổng sản phẩm"
        value={stats.total}
        icon={Package}
        description={`${stats.active} sản phẩm đang bán`}
      />

      {/* Active Products */}
      <StatsCard
        title="Đang bán"
        value={stats.active}
        icon={TrendingUp}
        trend={{
          value:
            stats.total > 0
              ? Math.round((stats.active / stats.total) * 100)
              : 0,
          label: "tỷ lệ active",
          positive: true,
        }}
      />

      {/* Inactive Products */}
      <StatsCard
        title="Ngừng bán"
        value={stats.inactive}
        icon={AlertTriangle}
        trend={{
          value:
            stats.total > 0
              ? Math.round((stats.inactive / stats.total) * 100)
              : 0,
          label: "ngừng KD",
          positive: false,
        }}
        description="Sản phẩm đã ẩn/ngừng bán"
      />

      {/* Categories */}
      <StatsCard
        title="Danh mục"
        value={categories.length}
        icon={Tags}
        description={`Top: ${chartStats.topCategories[0]?.name || "N/A"}`}
      />

      {/* Pie Chart - Products by Category */}
      <Card className="md:col-span-1 xl:col-span-2 shadow-sm border-border/60 transition-all hover:shadow-md">
        <CardHeader className="pb-2 border-b border-border/40 bg-muted/20 py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Phân bố theo danh mục
          </CardTitle>
          <CardDescription className="text-xs">
            Top danh mục có nhiều sản phẩm nhất
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {pieChartData.length > 0 ? (
            <div className="space-y-3">
              <ChartContainer
                config={pieChartConfig}
                className="mx-auto aspect-square max-h-[180px]"
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
                    outerRadius={80}
                    strokeWidth={2}
                    paddingAngle={2}
                  />
                </PieChart>
              </ChartContainer>
              
              {/* Legend with percentages */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {pieChartData.map((item, index) => {
                  const total = pieChartData.reduce((sum, d) => sum + d.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm flex-shrink-0" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-muted-foreground truncate">
                        {item.category}: <span className="font-semibold text-foreground">{percentage}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground/50 text-sm">
              Chưa có dữ liệu thống kê
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart - Status Distribution */}
      <Card className="md:col-span-1 xl:col-span-2 shadow-sm border-border/60 transition-all hover:shadow-md">
        <CardHeader className="pb-2 border-b border-border/40 bg-muted/20 py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Trạng thái sản phẩm
          </CardTitle>
          <CardDescription className="text-xs">
            Phân bố theo trạng thái bán hàng
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer config={barChartConfig} className="h-[180px] w-full">
            <BarChart
              data={barChartData}
              layout="vertical"
              margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={70}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)/0.2" }}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
