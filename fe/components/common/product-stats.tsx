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
import { Product } from "@/service/product.service";
import { Category } from "@/service/category.service";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Tags,
  BarChart3,
} from "lucide-react";

interface ProductStatsProps {
  products: Product[];
  categories: Category[];
}

export function ProductStats({ products, categories }: ProductStatsProps) {
  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.status === "active").length;
    const inactiveProducts = totalProducts - activeProducts;

    // Count products by category
    const categoryCount = categories.map((cat) => {
      const count = products.filter((p) => {
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
      totalProducts,
      activeProducts,
      inactiveProducts,
      categoryCount,
      topCategories,
    };
  }, [products, categories]);

  // Pie chart data
  const pieChartData = React.useMemo(() => {
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    return stats.topCategories.map((cat, idx) => ({
      category: cat.name,
      value: cat.value,
      fill: colors[idx % colors.length],
    }));
  }, [stats.topCategories]);

  const pieChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      value: { label: "Sản phẩm" },
    };
    stats.topCategories.forEach((cat, idx) => {
      config[`cat${idx + 1}`] = {
        label: cat.name,
        color: `var(--chart-${idx + 1})`,
      };
    });
    return config;
  }, [stats.topCategories]);

  // Bar chart data (status distribution)
  const barChartData = [
    { name: "Đang bán", value: stats.activeProducts, fill: "var(--chart-1)" },
    {
      name: "Ngừng bán",
      value: stats.inactiveProducts,
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng sản phẩm</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeProducts} đang bán
          </p>
        </CardContent>
      </Card>

      {/* Active Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đang bán</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.activeProducts}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.totalProducts > 0
              ? Math.round((stats.activeProducts / stats.totalProducts) * 100)
              : 0}
            % tổng sản phẩm
          </p>
        </CardContent>
      </Card>

      {/* Inactive Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ngừng bán</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.inactiveProducts}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.totalProducts > 0
              ? Math.round((stats.inactiveProducts / stats.totalProducts) * 100)
              : 0}
            % tổng sản phẩm
          </p>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Danh mục</CardTitle>
          <Tags className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categories.length}</div>
          <p className="text-xs text-muted-foreground">
            Top: {stats.topCategories[0]?.name || "N/A"}
          </p>
        </CardContent>
      </Card>

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
                              {stats.totalProducts}
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
