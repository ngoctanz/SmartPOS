"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { mockUsers } from "@/mock/users"
import { User } from "@/types/user"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RowActions } from "@/components/common/row-actions"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { toast } from "sonner" 
import { mockBranches } from "@/mock/branches"
import { format } from "date-fns"

export default function Page() {
  const [data, setData] = React.useState<User[]>(mockUsers)
  const [selectedItem, setSelectedItem] = React.useState<User | null>(null)
  
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  
  const handleView = (item: User) => {
    setSelectedItem(item)
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: User) => {
    setSelectedItem(item)
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleDelete = (item: User) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (selectedItem) {
        setData(data.filter(i => i._id !== selectedItem._id))
        setIsDeleteOpen(false)
        setSelectedItem(null)
        toast.success("Đã xóa người dùng thành công")
    }
  }

  const columns = React.useMemo<ColumnDef<User>[]>(() => [
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
    accessorKey: "userName",
    header: "Tên đăng nhập",
  },
  {
    accessorKey: "name",
    header: "Họ tên",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "SĐT",
  },
  {
    accessorKey: "branchId",
    header: "Chi nhánh",
    cell: ({ row }) => {
        const branchId = row.getValue("branchId");
        if (!branchId) return "---";
        const branch = mockBranches.find(b => b._id === branchId);
        return branch ? branch.branchName : branchId;
    }
  },
  {
    accessorKey: "role",
    header: "Vai trò",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("role")}</Badge>,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
            <Badge variant={status === "active" ? "default" : "secondary"}>
                {status}
            </Badge>
        )
    },
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
            <h1 className="text-2xl font-bold tracking-tight">Quản lý người dùng</h1>
      </div>
      <CommonTable columns={columns} data={data} filterCol="name" filterPlaceholder="Tìm người dùng..." />
      
       <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title={`Xóa người dùng ${selectedItem?.name}?`}
      />

       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title={isEdit ? "Chỉnh sửa người dùng" : "Chi tiết người dùng"}
         onEdit={!isEdit ? (() => setIsEdit(true)) : undefined}
       >
         {selectedItem && (
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Username</Label>
                    <Input defaultValue={selectedItem.userName} className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Họ tên</Label>
                    <Input defaultValue={selectedItem.name} className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Email</Label>
                    <Input defaultValue={selectedItem.email} className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">SĐT</Label>
                    <Input defaultValue={selectedItem.phone} className="col-span-3" readOnly={!isEdit} disabled={!isEdit} />
                </div>
            </div>
         )}
       </DetailModal>
    </div>
  )
}
