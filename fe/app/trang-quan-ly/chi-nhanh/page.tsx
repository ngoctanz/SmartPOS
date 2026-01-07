"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { Branch } from "@/service/branch.service" 
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { RowActions } from "@/components/common/row-actions"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { toast } from "sonner" 
import { format } from "date-fns"
import branchService from "@/service/branch.service"

export default function Page() {
  const [data, setData] = React.useState<Branch[]>([])
  const [loading, setLoading] = React.useState(false)
  
  const [selectedItem, setSelectedItem] = React.useState<Branch | null>(null)
  const [selectedItems, setSelectedItems] = React.useState<Branch[]>([])
  
  // Modal states
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false) 
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    branchName: "",
    address: "",
    contactInfo: ""
  })

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await branchService.getAll()
      if (res.data) {
        setData(res.data)
      }
    } catch (error) {
      toast.error("Không thể tải danh sách chi nhánh")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = () => {
    setSelectedItem(null)
    setFormData({ branchName: "", address: "", contactInfo: "" })
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleView = (item: Branch) => {
    setSelectedItem(item)
    setFormData({ 
        branchName: item.branchName, 
        address: item.address, 
        contactInfo: item.contactInfo || "" 
    })
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: Branch) => {
    setSelectedItem(item)
     setFormData({ 
        branchName: item.branchName, 
        address: item.address, 
        contactInfo: item.contactInfo || "" 
    })
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleDelete = (item: Branch) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  const handleDeleteMany = (items: Branch[]) => {
    setSelectedItems(items)
    setSelectedItem(null)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    try {
        if (selectedItem) {
            await branchService.remove(selectedItem._id)
            toast.success("Đã xóa chi nhánh thành công")
        } else if (selectedItems.length > 0) {
            await branchService.deleteMany(selectedItems.map(item => item._id))
            toast.success(`Đã xóa ${selectedItems.length} chi nhánh thành công`)
            setSelectedItems([])
        }
        fetchData()
    } catch (error) {
        toast.error("Xóa chi nhánh thất bại")
        console.error(error)
    } finally {
        setIsDeleteOpen(false)
        setSelectedItem(null)
    }
  }

  const handleSave = async () => {
      try {
          if (selectedItem) {
              await branchService.update(selectedItem._id, formData)
              toast.success("Cập nhật chi nhánh thành công")
          } else {
              await branchService.create(formData)
              toast.success("Tạo chi nhánh thành công")
          }
          setIsDetailOpen(false)
          fetchData()
      } catch (error: any) {
          toast.error(error?.message || "Có lỗi xảy ra")
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
        cell: ({ row, table }) => {
            const item = row.original
            const isAnyRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;
            return (
                <RowActions 
                    onView={() => handleView(item)}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                    disabled={isAnyRowSelected}
                />
            )
        }
    }
  ], []) 

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý chi nhánh</h1>
            <div className="flex gap-2">
                <button 
                    onClick={handleCreate}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded transition-colors"
                >
                    + Thêm mới
                </button>
            </div>
      </div>
      <CommonTable 
        columns={columns} 
        data={data} 
        filterCol="branchName" 
        filterPlaceholder="Tìm chi nhánh..." 
        onBulkAction={handleDeleteMany}
        bulkActionLabel="Xóa đã chọn"
        bulkActionIcon="trash"
      />

      <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title={selectedItem ? `Xóa chi nhánh ${selectedItem?.branchName}?` : `Xóa ${selectedItems.length} chi nhánh đang chọn?`}
        description={selectedItem ? "Hành động này sẽ xóa chi nhánh khỏi hệ thống. Bạn không thể hoàn tác." : "Hành động này sẽ xóa tất cả các chi nhánh đã chọn. Bạn có chắc chắn muốn tiếp tục?"}
      />

       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title={isEdit ? (selectedItem ? "Chỉnh sửa chi nhánh" : "Thêm mới chi nhánh") : "Chi tiết chi nhánh"}
         onEdit={!isEdit ? (() => setIsEdit(true)) : undefined}
         footer={isEdit ? (
             <div className="flex justify-end gap-2">
                 <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={() => setIsDetailOpen(false)}>Hủy</button>
                 <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90" onClick={handleSave}>Lưu</button>
             </div>
         ) : undefined}
       >
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Tên chi nhánh</Label>
                <Input 
                    value={formData.branchName}
                    onChange={(e) => setFormData({...formData, branchName: e.target.value})}
                    className="col-span-3" 
                    readOnly={!isEdit} 
                    disabled={!isEdit} 
                    placeholder="Nhập tên chi nhánh"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Địa chỉ</Label>
                <Input 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="col-span-3" 
                    readOnly={!isEdit} 
                    disabled={!isEdit} 
                    placeholder="Nhập địa chỉ"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Liên hệ</Label>
                <Input 
                    value={formData.contactInfo}
                    onChange={(e) => setFormData({...formData, contactInfo: e.target.value})}
                    className="col-span-3" 
                    readOnly={!isEdit} 
                    disabled={!isEdit} 
                    placeholder="Email, Số điện thoại,..."
                />
            </div>
        </div>
       </DetailModal>
    </div>
  )
}
