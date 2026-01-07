import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive"
import { ChartBranchInteractive } from "@/components/ui/chart-branch-interactive"
import { ChartCategoryInteractive } from "@/components/ui/chart-category-interactive"
import { DataTable } from "@/components/ui/data-table"
import { SectionCards } from "@/components/ui/section-cards"

import data from "./data.json"

const stats = {
  revenue: 2540000000,
  profit: 850000000,
  productCount: 1240,
  orderCount: 3500
}

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards stats={stats} />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <div className="px-4 lg:px-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartBranchInteractive />
          </div>
          <div className="lg:col-span-1">
            <ChartCategoryInteractive />
          </div>
        </div>
        <DataTable data={data} />
      </div>
    </div>
  )
}
