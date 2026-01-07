"use client"

import * as React from "react"
import { SectionCards } from "@/components/ui/section-cards"
import { ChartDailyRevenue } from "@/components/ui/chart-daily-revenue"
import { ChartTopProducts } from "@/components/ui/chart-top-products"
import { ChartLeastSellingProducts } from "@/components/ui/chart-least-selling"
import { ChartRevenueByBranch } from "@/components/ui/chart-revenue-by-branch"
import { ChartSalesByCategory } from "@/components/ui/chart-sales-by-category"
import dashboardService, {
  DashboardSummary,
  DailyStats,
  TopProduct,
  BranchRevenue,
  CategorySales,
} from "@/service/dashboard.service"
import { toast } from "sonner"
import { eventBus, Events } from "@/lib/data-events"

export default function DashboardPage() {
  // States
  const [loading, setLoading] = React.useState(true)
  const [summary, setSummary] = React.useState<DashboardSummary | undefined>()
  const [dailyStats, setDailyStats] = React.useState<DailyStats[]>([])
  const [topProducts, setTopProducts] = React.useState<TopProduct[]>([])
  const [leastSellingProducts, setLeastSellingProducts] = React.useState<TopProduct[]>([])
  const [revenueByBranch, setRevenueByBranch] = React.useState<BranchRevenue[]>([])
  const [salesByCategory, setSalesByCategory] = React.useState<CategorySales[]>([])

  // Period states
  const [summaryPeriod] = React.useState<"month" | "3month" | "6month">("month")
  const [dailyPeriod, setDailyPeriod] = React.useState<"month" | "3month" | "6month">("month")
  const [topProductsPeriod, setTopProductsPeriod] = React.useState<"month" | "3month" | "6month">("month")
  const [leastSellingPeriod, setLeastSellingPeriod] = React.useState<"month" | "3month" | "6month">("month")

  // Loading states for individual sections
  const [dailyLoading, setDailyLoading] = React.useState(false)
  const [topProductsLoading, setTopProductsLoading] = React.useState(false)
  const [leastSellingLoading, setLeastSellingLoading] = React.useState(false)

  // Fetch summary data
  const fetchSummary = React.useCallback(async () => {
    try {
      const response = await dashboardService.getSummary({ period: summaryPeriod })
      if (response.success && response.data) {
        setSummary(response.data)
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
      toast.error("Không thể tải dữ liệu tổng quan")
    }
  }, [summaryPeriod])

  // Fetch daily stats
  const fetchDailyStats = React.useCallback(async () => {
    setDailyLoading(true)
    try {
      const response = await dashboardService.getDailyStats({ period: dailyPeriod })
      if (response.success && response.data) {
        setDailyStats(response.data)
      }
    } catch (error) {
      console.error("Error fetching daily stats:", error)
    } finally {
      setDailyLoading(false)
    }
  }, [dailyPeriod])

  // Fetch top products
  const fetchTopProducts = React.useCallback(async () => {
    setTopProductsLoading(true)
    try {
      const response = await dashboardService.getTopProducts({ period: topProductsPeriod, limit: 10 })
      if (response.success && response.data) {
        setTopProducts(response.data)
      }
    } catch (error) {
      console.error("Error fetching top products:", error)
    } finally {
      setTopProductsLoading(false)
    }
  }, [topProductsPeriod])

  // Fetch least selling products
  const fetchLeastSellingProducts = React.useCallback(async () => {
    setLeastSellingLoading(true)
    try {
      const response = await dashboardService.getLeastSellingProducts({ period: leastSellingPeriod, limit: 10 })
      if (response.success && response.data) {
        setLeastSellingProducts(response.data)
      }
    } catch (error) {
      console.error("Error fetching least selling products:", error)
    } finally {
      setLeastSellingLoading(false)
    }
  }, [leastSellingPeriod])

  // Fetch revenue by branch
  const fetchRevenueByBranch = React.useCallback(async () => {
    try {
      const response = await dashboardService.getRevenueByBranch({ period: summaryPeriod })
      if (response.success && response.data) {
        setRevenueByBranch(response.data)
      }
    } catch (error) {
      console.error("Error fetching revenue by branch:", error)
    }
  }, [summaryPeriod])

  // Fetch sales by category
  const fetchSalesByCategory = React.useCallback(async () => {
    try {
      const response = await dashboardService.getSalesByCategory({ period: summaryPeriod })
      if (response.success && response.data) {
        setSalesByCategory(response.data)
      }
    } catch (error) {
      console.error("Error fetching sales by category:", error)
    }
  }, [summaryPeriod])

  // Initial data fetch and subscribe to events
  React.useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchSummary(),
        fetchDailyStats(),
        fetchTopProducts(),
        fetchLeastSellingProducts(),
        fetchRevenueByBranch(),
        fetchSalesByCategory(),
      ])
    }




    const fetchInitialData = async () => {
      setLoading(true)
      await fetchAllData()
      setLoading(false)
    }

    fetchInitialData()

    // Subscribe to events
    const unsubscribe = eventBus.on(Events.DATA_CHANGED, () => {
      console.log("Data changed event received, refreshing dashboard...")
      fetchAllData()
    })

    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when periods change
  React.useEffect(() => {
    if (!loading) {
      fetchDailyStats()
    }
  }, [dailyPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!loading) {
      fetchTopProducts()
    }
  }, [topProductsPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!loading) {
      fetchLeastSellingProducts()
    }
  }, [leastSellingPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Stats Cards */}
        <SectionCards stats={summary} loading={loading} />

        {/* Daily Revenue Chart */}
        <div className="px-4 lg:px-6">
          <ChartDailyRevenue
            data={dailyStats}
            loading={dailyLoading || loading}
            period={dailyPeriod}
            onPeriodChange={(period) => setDailyPeriod(period as "month" | "3month" | "6month")}
          />
        </div>

        {/* Top Products & Least Selling Products */}
        <div className="px-4 lg:px-6 grid gap-4 lg:grid-cols-2">
          <ChartTopProducts
            data={topProducts}
            loading={topProductsLoading || loading}
            period={topProductsPeriod}
            onPeriodChange={(period) => setTopProductsPeriod(period as "month" | "3month" | "6month")}
          />
          <ChartLeastSellingProducts
            data={leastSellingProducts}
            loading={leastSellingLoading || loading}
            period={leastSellingPeriod}
            onPeriodChange={(period) => setLeastSellingPeriod(period as "month" | "3month" | "6month")}
          />
        </div>

        {/* Revenue by Branch & Sales by Category */}
        <div className="px-4 lg:px-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartRevenueByBranch
              data={revenueByBranch}
              loading={loading}
            />
          </div>
          <div className="lg:col-span-1">
            <ChartSalesByCategory
              data={salesByCategory}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
