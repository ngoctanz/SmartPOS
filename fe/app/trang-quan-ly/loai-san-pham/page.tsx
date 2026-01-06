"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { mockCategories } from "@/mock/categories"
import { Category } from "@/types/category"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { RowActions } from "@/components/common/row-actions"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { toast } from "sonner" 
import { format } from "date-fns"

export default function Page() {
  const [data, setData] = React.useState<Category[]>(mockCategories)
  const [selectedItem, setSelectedItem] = React.useState<Category | null>(null)
  
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  
  const handleView = (item: Category) => {
    setSelectedItem(item)
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: Category) => {
    setSelectedItem(item)
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleDelete = (item: Category) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (selectedItem) {
        setData(data.filter(i => i._id !== selectedItem._id))
        setIsDeleteOpen(false)
        setSelectedItem(null)
        toast.success("Đã xóa danh mục thành công")
    }
  }

  const columns = React.useMemo<ColumnDef<Category>[]>(() => [
    {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
        accessorKey: "name",
        header: "Tên loại",
      },
      {
        accessorKey: "desc",
        header: "Mô tả",
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => {
            try {
                return format(new Date(row.getValue("createdAt")), "dd/MM/yyyy");
            } catch {
                return row.getValue("createdAt");
            }
        }
      },
      {
        id: "actions",
        cell: ({ row }) => (
            <RowActions 
                onView={() => handleView(row.original)}
                onEdit={() => handleEdit(row.original)}
                onDelete={() => handleDelete(row.original)}
            />
        )
      }
  ], [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý loại sản phẩm</h1>
      </div>
      <CommonTable columns={columns} data={data} filterCol="name" filterPlaceholder="Tìm loại sản phẩm..." />
      
       <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title={`Xóa danh mục ${selectedItem?.name}?`}
      />

       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title={isEdit ? "Chỉnh sửa danh mục" : "Chi tiết danh mục"}
         onEdit={!isEdit ? (() => setIsEdit(true)) : undefined}
       >
         {selectedItem && (
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tên loại</Label>
                    <Input defaultValue={selectedItem.name} className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Mô tả</Label>
                    <Input defaultValue={selectedItem.desc} className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
            </div>
         )}
       </DetailModal>
    </div>
  )
}
