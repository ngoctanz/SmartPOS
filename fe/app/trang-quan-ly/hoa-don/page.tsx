"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { mockReceipts } from "@/mock/receipts"
import { Receipt } from "@/types/receipt"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { RowActions } from "@/components/common/row-actions"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { mockBranches, mockUsers } from "@/mock/index"

export default function Page() {
  const [data] = React.useState<Receipt[]>(mockReceipts)
  const [selectedItem, setSelectedItem] = React.useState<Receipt | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  
  const handleView = (item: Receipt) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
  }

  const columns = React.useMemo<ColumnDef<Receipt>[]>(() => [
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
    accessorKey: "code",
    header: "Mã hóa đơn",
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
    accessorKey: "createdBy",
    header: "Người lập",
    cell: ({ row }) => {
        const userId = row.getValue("createdBy");
        const user = mockUsers.find(u => u._id === userId);
        return user ? user.name : userId;
    }
  },
  {
    accessorKey: "createdAt",
    header: "Ngày lập",
    cell: ({ row }) => {
       try {
           return format(new Date(row.getValue("createdAt")), "dd/MM/yyyy HH:mm");
       } catch {
           return row.getValue("createdAt");
       }
    }
  },
  {
    accessorKey: "paymentMethod",
    header: "Thanh toán",
    cell: ({ row }) => {
        const method = row.getValue("paymentMethod") as string;
        return method === "cash" ? "Tiền mặt" : method === "card" ? "Thẻ" : "Chuyển khoản";
    }
  },
  {
    accessorKey: "totalAmount",
    header: "Tổng tiền",
    cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"));
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
     cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
            <Badge variant={status === "completed" ? "default" : "destructive"}>
                {status === "completed" ? "Hoàn thành" : "Đã hủy"}
            </Badge>
        )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
        <RowActions 
            onView={() => handleView(row.original)}
            // Disable edit/delete for receipts in this context or implement specific logic (e.g., cancel)
        />
    )
  }
  ], [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý hóa đơn</h1>
      </div>
      <CommonTable columns={columns} data={data} filterCol="code" filterPlaceholder="Tìm mã hóa đơn..." />
      
       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title="Chi tiết hóa đơn"
         footer={<div />} // Hide default edit button
       >
         {selectedItem && (
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Mã HĐ</Label>
                    <Input defaultValue={selectedItem.code} className="col-span-3" readOnly />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Ngày lập</Label>
                    <Input defaultValue={format(new Date(selectedItem.createdAt), "dd/MM/yyyy HH:mm")} className="col-span-3" readOnly />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tổng tiền</Label>
                    <Input defaultValue={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedItem.totalAmount)} className="col-span-3" readOnly />
                </div>
                
                 <div className="mt-4">
                    <h4 className="mb-2 font-medium">Danh sách sản phẩm</h4>
                    <div className="border rounded-md p-2 text-sm">
                        {selectedItem.listProduct.map((p, index) => (
                             <div key={index} className="flex justify-between py-1 border-b last:border-0">
                                <span>{p.productName} (x{p.quantity})</span>
                                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.salePrice * p.quantity)}</span>
                             </div>
                        ))}
                    </div>
                 </div>
            </div>
         )}
       </DetailModal>
    </div>
  )
}
