"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { mockImportReceipts } from "@/mock/receipts"
import { ImportReceipt } from "@/types/receipt"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { RowActions } from "@/components/common/row-actions"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { mockBranches, mockUsers } from "@/mock/index"
import Barcode from "react-barcode"
import { DetailModal } from "@/components/common/detail-modal"

export default function Page() {
  const [data] = React.useState<ImportReceipt[]>(mockImportReceipts)
  const [selectedItem, setSelectedItem] = React.useState<ImportReceipt | null>(null)
  
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  
  const handleView = (item: ImportReceipt) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
  }

  const columns = React.useMemo<ColumnDef<ImportReceipt>[]>(() => [
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
    header: "Mã phiếu nhập",
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
    accessorKey: "supplierName",
    header: "Nhà cung cấp",
  },
  {
    accessorKey: "createdBy",
    header: "Người nhập",
    cell: ({ row }) => {
        const userId = row.getValue("createdBy");
        const user = mockUsers.find(u => u._id === userId);
        return user ? user.name : userId;
    }
  },
  {
    accessorKey: "createdAt",
    header: "Ngày nhập",
    cell: ({ row }) => {
       try {
           return format(new Date(row.getValue("createdAt")), "dd/MM/yyyy HH:mm");
       } catch {
           return row.getValue("createdAt");
       }
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
        let label = status;
        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        
        if (status === "completed") {
            label = "Hoàn thành";
            variant = "default";
        } else if (status === "pending") {
            label = "Chờ xử lý";
            variant = "secondary";
        } else {
            label = "Đã hủy";
            variant = "destructive";
        }

        return (
            <Badge variant={variant}>
                {label}
            </Badge>
        )
    },
  },
  {
    accessorKey: "note",
    header: "Ghi chú",
    cell: ({ row }) => <div className="max-w-[200px] truncate" title={row.getValue("note")}>{row.getValue("note")}</div>
  },
  {
    id: "actions",
    cell: ({ row }) => (
        <RowActions 
            onView={() => handleView(row.original)}
        />
    )
  }
  ], [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
       <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý nhập hàng</h1>
      </div>
      <CommonTable columns={columns} data={data} filterCol="code" filterPlaceholder="Tìm mã phiếu nhập..." />
      
       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title="Chi tiết phiếu nhập"
         footer={<div />}
       >
         {selectedItem && (
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Mã phiếu</Label>
                    <div className="col-span-3">
                         <Input defaultValue={selectedItem.code} className="mb-2" readOnly />
                         <div className="flex w-fit rounded border p-2 bg-white">
                            <Barcode value={selectedItem.code} width={1.5} height={40} fontSize={12} margin={0} />
                         </div>
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Nhà cung cấp</Label>
                    <Input defaultValue={selectedItem.supplierName} className="col-span-3" readOnly />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tổng tiền</Label>
                    <Input defaultValue={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedItem.totalAmount)} className="col-span-3" readOnly />
                </div>
                
                 <div className="mt-4">
                    <h4 className="mb-2 font-medium">Danh sách sản phẩm nhập</h4>
                    <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-2 text-left font-medium min-w-[130px]">Mã vạch</th>
                                    <th className="p-2 text-left font-medium">Tên sản phẩm</th>
                                    <th className="p-2 text-right font-medium">SL</th>
                                    <th className="p-2 text-right font-medium">Đơn giá</th>
                                    <th className="p-2 text-right font-medium">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedItem.listProduct.map((p, index) => (
                                    <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="p-2 py-4">
                                            {p.barcode ? (
                                                <div className="flex">
                                                    <Barcode value={p.barcode} width={1.2} height={40} fontSize={11} displayValue={true} margin={0} />
                                                </div>
                                            ) : (
                                                "---"
                                            )}
                                        </td>
                                        <td className="p-2 py-4 align-middle">{p.productName}</td>
                                        <td className="p-2 py-4 text-right align-middle">{p.quantity}</td>
                                        <td className="p-2 py-4 text-right align-middle">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.importPrice)}</td>
                                        <td className="p-2 py-4 text-right font-medium align-middle">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted/50 font-medium">
                                <tr>
                                    <td colSpan={4} className="p-2 text-right">Tổng cộng:</td>
                                    <td className="p-2 text-right">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedItem.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                 </div>
            </div>
         )}
       </DetailModal>
    </div>
  )
}
