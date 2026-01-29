"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TopProduct } from "@/service/dashboard.service"
import { IconTrophy } from "@tabler/icons-react"

interface TableTopProductsProps {
  data: TopProduct[]
  loading?: boolean
  period?: string
}

const periodLabels: Record<string, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  "3month": "3 tháng",
  "6month": "6 tháng",
  year: "Năm nay",
}

export function TableTopProducts({
  data,
  loading,
  period = "month",
}: TableTopProductsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value)
  }

  const periodLabel = periodLabels[period] || "Tháng này"

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <IconTrophy className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-base font-semibold">
            Top 10 sản phẩm bán chạy
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <p className="text-xs text-muted-foreground mb-3 px-4 sm:px-0">
          Thống kê {periodLabel.toLowerCase()}
        </p>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Chưa có dữ liệu bán hàng
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm">
            <div 
              className="overflow-x-auto"
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              <Table className="w-full" style={{ minWidth: "max-content" }}>
                <TableHeader>
                  <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[180px]">Sản phẩm</TableHead>
                    <TableHead className="text-right min-w-[100px]">SL bán</TableHead>
                    <TableHead className="text-right min-w-[120px]">Doanh thu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((product, index) => (
                    <TableRow key={product._id} className="transition-colors">
                      <TableCell className="text-center font-medium">
                        {index < 3 ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : index === 1
                                ? "bg-gray-100 text-gray-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate">
                          {product.productName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(product.totalQuantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(product.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
