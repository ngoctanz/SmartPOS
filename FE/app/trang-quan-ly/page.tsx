"use client"

import * as React from "react"
import { SectionCards } from "@/components/ui/section-cards"
import { ChartDailyRevenue } from "@/components/ui/chart-daily-revenue"
import { ChartTopProducts } from "@/components/ui/chart-top-products"
import { ChartLeastSellingProducts } from "@/components/ui/chart-least-selling"
import { ChartRevenueByBranch } from "@/components/ui/chart-revenue-by-branch"
import { ChartSalesByCategory } from "@/components/ui/chart-sales-by-category"
import { TableTopProducts } from "@/components/ui/table-top-products"
import dashboardService, {
  DashboardSummary,
  DailyStats,
  TopProduct,
  BranchRevenue,
  CategorySales,
} from "@/service/dashboard.service"
import branchService, { Branch } from "@/service/branch.service"
import { useAuth } from "@/hooks/useAuth"
import { eventBus, Events } from "@/lib/data-events"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PeriodType = "week" | "month" | "3month" | "6month" | "year"

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  // Branch filter state (admin only)
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [filterBranchId, setFilterBranchId] = React.useState<string>("all")

  // Single global period for all dashboard data
  const [period, setPeriod] = React.useState<PeriodType>("month")

  // Effective branchId for API calls
  const effectiveBranchId = React.useMemo(() => {
    if (isAdmin) {
      return filterBranchId !== "all" ? filterBranchId : undefined
    }
    return user?.branchId 
  }, [isAdmin, filterBranchId, user?.branchId])

  // States
  const [loading, setLoading] = React.useState(true)
  const [summary, setSummary] = React.useState<DashboardSummary | undefined>()
  const [dailyStats, setDailyStats] = React.useState<DailyStats[]>([])
  const [topProducts, setTopProducts] = React.useState<TopProduct[]>([])
  const [leastSellingProducts, setLeastSellingProducts] = React.useState<TopProduct[]>([])
  const [revenueByBranch, setRevenueByBranch] = React.useState<BranchRevenue[]>([])
  const [salesByCategory, setSalesByCategory] = React.useState<CategorySales[]>([])

  // Fetch branches (admin only)
  React.useEffect(() => {
    if (!isAdmin) return
    
    const fetchBranches = async () => {
      try {
        const res = await branchService.getAll()
        if (res.data) setBranches(res.data)
      } catch (error) {
        console.error("Failed to fetch branches", error)
      }
    }
    
    fetchBranches()
  }, [isAdmin])

  // Single fetch function for all dashboard data
  const fetchDashboardData = React.useCallback(async () => {
    if (user === undefined) return

    setLoading(true)
    
    try {
      // Fetch all data in parallel
      const results = await Promise.allSettled([
        dashboardService.getSummary({ period, branchId: effectiveBranchId }),
        dashboardService.getDailyStats({ period, branchId: effectiveBranchId }),
        dashboardService.getTopProducts({ period, limit: 10, branchId: effectiveBranchId }),
        dashboardService.getLeastSellingProducts({ period, limit: 10, branchId: effectiveBranchId }),
        isAdmin ? dashboardService.getRevenueByBranch({ period }) : Promise.resolve(null),
        dashboardService.getSalesByCategory({ period, branchId: effectiveBranchId }),
      ])

      // Process results
      if (results[0].status === "fulfilled" && results[0].value?.data) {
        setSummary(results[0].value.data)
      }
      if (results[1].status === "fulfilled" && results[1].value?.data) {
        setDailyStats(results[1].value.data)
      }
      if (results[2].status === "fulfilled" && results[2].value?.data) {
        setTopProducts(results[2].value.data)
      }
      if (results[3].status === "fulfilled" && results[3].value?.data) {
        setLeastSellingProducts(results[3].value.data)
      }
      if (results[4].status === "fulfilled" && results[4].value?.data) {
        setRevenueByBranch(results[4].value.data)
      }
      if (results[5].status === "fulfilled" && results[5].value?.data) {
        setSalesByCategory(results[5].value.data)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [user, period, effectiveBranchId, isAdmin])

  // Fetch data when dependencies change
  React.useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Subscribe to data change events
  React.useEffect(() => {
    const unsubscribe = eventBus.on(Events.DATA_CHANGED, () => {
      console.log("Data changed event received, refreshing dashboard...")
      fetchDashboardData()
    })
    return () => unsubscribe()
  }, [fetchDashboardData])

  // Get current branch name for display
  const currentBranchName = React.useMemo(() => {
    if (isAdmin && filterBranchId !== "all") {
      return branches.find(b => b._id === filterBranchId)?.branchName
    }
    return null
  }, [isAdmin, filterBranchId, branches])

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Header with branch filter */}
        <div className="px-4 lg:px-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                Thống kê chi nhánh của bạn
              </p>
            )}
            {isAdmin && currentBranchName && (
              <p className="text-sm text-muted-foreground">
                Đang xem: {currentBranchName}
              </p>
            )}
          </div>
          {isAdmin && (
            <Select value={filterBranchId} onValueChange={setFilterBranchId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tất cả chi nhánh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stats Cards with period selector */}
        <SectionCards 
          stats={summary} 
          loading={loading} 
          period={period}
          onPeriodChange={(p) => setPeriod(p as PeriodType)}
        />

        {/* Daily Revenue Chart */}
        <div className="px-4 lg:px-6">
          <ChartDailyRevenue
            data={dailyStats}
            loading={loading}
            period={period}
          />
        </div>

        {/* Top Products & Least Selling Products Charts */}
        <div className="px-4 lg:px-6 grid gap-4 lg:grid-cols-2">
          <ChartTopProducts
            data={topProducts}
            loading={loading}
          />
          <ChartLeastSellingProducts
            data={leastSellingProducts}
            loading={loading}
          />
        </div>

        {/* Revenue by Branch & Sales by Category */}
        <div className={`px-4 lg:px-6 grid gap-4 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          {isAdmin && (
            <div className="lg:col-span-2">
              <ChartRevenueByBranch
                data={revenueByBranch}
                loading={loading}
              />
            </div>
          )}
          <div className={isAdmin ? "lg:col-span-1" : ""}>
            <ChartSalesByCategory
              data={salesByCategory}
              loading={loading}
            />
          </div>
        </div>

        {/* Top Products Table */}
        <div className="px-4 lg:px-6">
          <TableTopProducts
            data={topProducts}
            loading={loading}
            period={period}
          />
        </div>
      </div>
    </div>
  )
}
