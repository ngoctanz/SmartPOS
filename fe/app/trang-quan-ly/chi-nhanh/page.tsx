"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { mockBranches } from "@/mock/branches"
import { Branch } from "@/types/branch"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { RowActions } from "@/components/common/row-actions"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { toast } from "sonner" // Assuming sonner is installed

import { format } from "date-fns"

export default function Page() {
  const [data, setData] = React.useState<Branch[]>(mockBranches)
  const [selectedItem, setSelectedItem] = React.useState<Branch | null>(null)
  
  // Modal states
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false) // true if editing, false if viewing
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  
  const handleView = (item: Branch) => {
    setSelectedItem(item)
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: Branch) => {
    setSelectedItem(item)
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleDelete = (item: Branch) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (selectedItem) {
        setData(data.filter(i => i._id !== selectedItem._id))
        setIsDeleteOpen(false)
        setSelectedItem(null)
        toast.success("Đã xóa chi nhánh thành công")
    }
  }


  const columns = React.useMemo<ColumnDef<Branch>[]>(() => [
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
      size: 40,
    },
    {
      accessorKey: "branchName",
      header: "Tên chi nhánh",
    },
    {
      accessorKey: "address",
      header: "Địa chỉ",
    },
    {
      accessorKey: "contactInfo",
      header: "Liên hệ",
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
        enableHiding: false,
        cell: ({ row }) => {
            const item = row.original
            return (
                <RowActions 
                    onView={() => handleView(item)}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                />
            )
        }
    }
  ], [data]) // Re-create if data changes (though actions don't depend on data directly, good practice)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý chi nhánh</h1>
      </div>
      <CommonTable columns={columns} data={data} filterCol="branchName" filterPlaceholder="Tìm chi nhánh..." />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title={`Xóa chi nhánh ${selectedItem?.branchName}?`}
        description="Hành động này sẽ xóa chi nhánh khỏi hệ thống. Bạn không thể hoàn tác."
      />

       {/* Detail / Edit Modal */}
       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title={isEdit ? "Chỉnh sửa chi nhánh" : "Chi tiết chi nhánh"}
         onEdit={!isEdit ? (() => setIsEdit(true)) : undefined}
       >
         {selectedItem && (
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tên chi nhánh</Label>
                    <Input 
                        defaultValue={selectedItem.branchName} 
                        className="col-span-3" 
                        readOnly={!isEdit} 
                        disabled={!isEdit} 
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Địa chỉ</Label>
                    <Input 
                        defaultValue={selectedItem.address} 
                        className="col-span-3" 
                        readOnly={!isEdit} 
                        disabled={!isEdit} 
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Liên hệ</Label>
                    <Input 
                        defaultValue={selectedItem.contactInfo} 
                        className="col-span-3" 
                        readOnly={!isEdit} 
                        disabled={!isEdit} 
                    />
                </div>
            </div>
         )}
       </DetailModal>
    </div>
  )
}
