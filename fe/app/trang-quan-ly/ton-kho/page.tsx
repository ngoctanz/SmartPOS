"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { mockBranchProducts, mockProducts, mockBranches } from "@/mock/index"
import { BranchProduct } from "@/types/product"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RowActions } from "@/components/common/row-actions"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { format } from "date-fns"

export default function Page() {
  const [data] = React.useState<BranchProduct[]>(mockBranchProducts)
  const [selectedItem, setSelectedItem] = React.useState<BranchProduct | null>(null)
  
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false)

  const handleView = (item: BranchProduct) => {
    setSelectedItem(item)
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: BranchProduct) => {
    setSelectedItem(item)
    setIsEdit(true)
    setIsDetailOpen(true)
  }
  
  const columns = React.useMemo<ColumnDef<BranchProduct>[]>(() => [
    {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "branchId",
    header: "Chi nhánh",
     cell: ({ row }) => {
        const branchId = row.getValue("branchId");
        const branch = mockBranches.find(b => b._id === branchId);
        return branch ? branch.branchName : branchId;
    }
  },
  {
    accessorKey: "productId",
    header: "Sản phẩm",
     cell: ({ row }) => {
        const productId = row.getValue("productId");
        const product = mockProducts.find(p => p._id === productId);
        return product ? product.name : productId;
    }
  },
   {
    accessorKey: "stock",
    header: "Tồn kho",
     cell: ({ row }) => {
        const stock = row.getValue("stock") as number;
        const minStock = row.original.minStock;
        return (
            <div className="flex items-center gap-2">
                <span>{stock}</span>
                {stock <= minStock && (
                     <Badge variant="destructive" className="text-xs">Sắp hết</Badge>
                )}
            </div>
        )
    }
  },
  {
    accessorKey: "minStock",
    header: "Định mức tối thiểu",
  },
  {
    accessorKey: "updatedAt",
    header: "Cập nhật lần cuối",
    cell: ({ row }) => {
       try {
           return format(new Date(row.getValue("updatedAt")), "dd/MM/yyyy HH:mm");
       } catch {
           return row.getValue("updatedAt");
       }
    }
  },
  {
    id: "actions",
    cell: ({ row }) => (
        <RowActions 
            onView={() => handleView(row.original)}
            onEdit={() => handleEdit(row.original)}
            // Inventory usually not deleted directly, maybe adjusted via stock take
        />
    )
  }
  ], [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý tồn kho</h1>
      </div>
      <CommonTable columns={columns} data={data} filterCol="branchId" filterPlaceholder="Lọc theo chi nhánh..." />
      
       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title={isEdit ? "Điều chỉnh tồn kho" : "Chi tiết tồn kho"}
         onEdit={!isEdit ? (() => setIsEdit(true)) : undefined}
       >
         {selectedItem && (
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Chi nhánh</Label>
                    <Input defaultValue={mockBranches.find(b => b._id === selectedItem.branchId)?.branchName} className="col-span-3" readOnly disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Sản phẩm</Label>
                    <Input defaultValue={mockProducts.find(p => p._id === selectedItem.productId)?.name} className="col-span-3" readOnly disabled />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tồn kho</Label>
                    <Input defaultValue={selectedItem.stock} type="number" className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Min Stock</Label>
                    <Input defaultValue={selectedItem.minStock} type="number" className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
            </div>
         )}
       </DetailModal>
    </div>
  )
}
