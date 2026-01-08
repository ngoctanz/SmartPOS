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
import { Button } from "@/components/ui/button"
import { Plus, LayoutGrid, RotateCcw, Archive, Loader2, Trash2, MoreHorizontal } from "lucide-react"
import { StatsCard } from "@/components/common/stats-card"
import { useTableData } from "@/hooks/useTableData"
import { useStats } from "@/hooks/useStats"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Page() {
  // Tab state: "active" | "deleted"
  const [viewMode, setViewMode] = React.useState<"active" | "deleted">("active")

  // Use custom hooks - fetch all including deleted for tab view
  const { data, searchTerm, pagination, handlePageChange, handleSearch, refetch } = 
    useTableData<Branch>({
      fetchFn: (params) => branchService.getAll({ ...params, includeDeleted: true }),
    });

  const { stats, refetch: refetchStats } = useStats<{ total: number }>({
    fetchFn: branchService.getStats,
  });

  // Filter data based on viewMode
  const filteredData = React.useMemo(() => {
    if (viewMode === "deleted") {
      return data.filter(item => item.isDeleted)
    }
    return data.filter(item => !item.isDeleted)
  }, [data, viewMode])

  // Count deleted branches
  const deletedCount = React.useMemo(() => {
    return data.filter(item => item.isDeleted).length
  }, [data])
  
  const [selectedItem, setSelectedItem] = React.useState<Branch | null>(null)
  const [selectedItems, setSelectedItems] = React.useState<Branch[]>([])
  
  // Modal states
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false) 
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isRestoreOpen, setIsRestoreOpen] = React.useState(false)
  const [isHardDeleteOpen, setIsHardDeleteOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    branchName: "",
    address: "",
    contactInfo: ""
  })

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
    setSelectedItems([])
    setIsDeleteOpen(true)
  }

  const handleDeleteMany = (items: Branch[]) => {
    setSelectedItems(items)
    setSelectedItem(null)
    setIsDeleteOpen(true)
  }

  const handleRestore = (item: Branch) => {
    setSelectedItem(item)
    setIsRestoreOpen(true)
  }

  const handleHardDelete = (item: Branch) => {
    setSelectedItem(item)
    setIsHardDeleteOpen(true)
  }

  const confirmDelete = async () => {
    try {
        setIsSubmitting(true)
        if (selectedItem) {
            await branchService.remove(selectedItem._id)
            toast.success("Đã ngưng hoạt động chi nhánh")
        } else if (selectedItems.length > 0) {
            await branchService.deleteMany(selectedItems.map(item => item._id))
            toast.success(`Đã ngưng hoạt động ${selectedItems.length} chi nhánh`)
            setSelectedItems([])
        }
        refetch()
        refetchStats()
    } catch (error) {
        toast.error("Thao tác thất bại")
        console.error(error)
    } finally {
        setIsSubmitting(false)
        setIsDeleteOpen(false)
        setSelectedItem(null)
    }
  }

  const confirmRestore = async () => {
    if (!selectedItem) return
    try {
        setIsSubmitting(true)
        await branchService.restore(selectedItem._id)
        toast.success("Đã khôi phục chi nhánh thành công")
        refetch()
        refetchStats()
    } catch (error) {
        toast.error("Khôi phục thất bại")
        console.error(error)
    } finally {
        setIsSubmitting(false)
        setIsRestoreOpen(false)
        setSelectedItem(null)
    }
  }

  const confirmHardDelete = async () => {
    if (!selectedItem) return
    try {
        setIsSubmitting(true)
        await branchService.hardDelete(selectedItem._id)
        toast.success("Đã xóa vĩnh viễn chi nhánh")
        refetch()
        refetchStats()
    } catch (error: any) {
        toast.error(error?.message || "Xóa thất bại")
        console.error(error)
    } finally {
        setIsSubmitting(false)
        setIsHardDeleteOpen(false)
        setSelectedItem(null)
    }
  }

  const handleSave = async () => {
      try {
          setIsSubmitting(true)
          if (selectedItem) {
              await branchService.update(selectedItem._id, formData)
              toast.success("Cập nhật chi nhánh thành công")
          } else {
              await branchService.create(formData)
              toast.success("Tạo chi nhánh thành công")
          }
          setIsDetailOpen(false)
          refetch()
          refetchStats()
      } catch (error: any) {
          toast.error(error?.message || "Có lỗi xảy ra")
      } finally {
          setIsSubmitting(false)
      }
  }

  // Columns for active branches
  const activeColumns = React.useMemo<ColumnDef<Branch>[]>(() => [
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
                    onAction={() => handleDelete(item)}
                    actionLabel="Ngưng hoạt động"
                    actionIcon="lock"
                    disabled={isAnyRowSelected}
                />
            )
        }
    }
  ], [])

  // Columns for deleted branches (no select, different actions)
  const deletedColumns = React.useMemo<ColumnDef<Branch>[]>(() => [
    {
      accessorKey: "branchName",
      header: "Tên chi nhánh",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{row.getValue("branchName")}</span>
          <Badge variant="secondary" className="text-xs">Đã ngưng</Badge>
        </div>
      )
    },
    {
      accessorKey: "address",
      header: "Địa chỉ",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("address")}</span>
      )
    },
    {
      accessorKey: "contactInfo",
      header: "Liên hệ",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("contactInfo") || "—"}</span>
      )
    },
    {
      accessorKey: "deletedAt",
      header: "Ngày ngưng",
      cell: ({ row }) => {
          try {
              const deletedAt = row.original.deletedAt
              return deletedAt ? format(new Date(deletedAt), "dd/MM/yyyy HH:mm") : "—"
          } catch {
              return "—"
          }
      }
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const item = row.original
            return (
              <DeletedBranchActions 
                branch={item}
                onRestore={handleRestore}
                onHardDelete={handleHardDelete}
              />
            )
        }
    }
  ], [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Quản lý chi nhánh</h1>
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm mới
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Chi nhánh hoạt động"
          value={stats?.total || 0}
          icon={LayoutGrid}
          description="Số lượng chi nhánh đang hoạt động"
        />
        <StatsCard
          title="Đã ngưng hoạt động"
          value={deletedCount}
          icon={Archive}
          description="Chi nhánh đã ngưng hoạt động"
          trend={deletedCount > 0 ? "neutral" : undefined}
        />
      </div>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "active" | "deleted")}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Đang hoạt động ({stats?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Archive className="h-4 w-4" />
            Đã ngưng ({deletedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === "active" ? (
        <CommonTable 
          columns={activeColumns} 
          data={filteredData} 
          filterCol="branchName" 
          filterPlaceholder="Tìm chi nhánh..." 
          onBulkAction={handleDeleteMany}
          bulkActionLabel="Ngưng hoạt động"
          bulkActionIcon="lock"
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
        />
      ) : (
        <CommonTable 
          columns={deletedColumns} 
          data={filteredData} 
          filterCol="branchName" 
          filterPlaceholder="Tìm chi nhánh đã ngưng..." 
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
        />
      )}

      {/* Confirm Dialog - Updated for soft delete */}
      <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title={selectedItem 
          ? `Ngưng hoạt động chi nhánh "${selectedItem?.branchName}"?` 
          : `Ngưng hoạt động ${selectedItems.length} chi nhánh?`
        }
        description={
          selectedItem 
            ? "Chi nhánh sẽ được chuyển sang trạng thái ngưng hoạt động. Dữ liệu lịch sử (hóa đơn, phiếu nhập) vẫn được giữ nguyên. Bạn có thể khôi phục chi nhánh bất cứ lúc nào."
            : "Các chi nhánh đã chọn sẽ được chuyển sang trạng thái ngưng hoạt động. Dữ liệu lịch sử vẫn được giữ nguyên và có thể khôi phục."
        }
        confirmLabel="Ngưng hoạt động"
        variant="default"
      />

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục chi nhánh?</AlertDialogTitle>
            <AlertDialogDescription>
              Chi nhánh "{selectedItem?.branchName}" sẽ được khôi phục và hoạt động trở lại bình thường.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : "Khôi phục"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail/Edit Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={isEdit ? (selectedItem ? "Chỉnh sửa chi nhánh" : "Thêm mới chi nhánh") : "Chi tiết chi nhánh"}
        onEdit={!isEdit ? (() => setIsEdit(true)) : undefined}
        footer={isEdit ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
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

      {/* Hard Delete Confirmation Dialog */}
      <ConfirmDeleteDialog 
        open={isHardDeleteOpen}
        onOpenChange={setIsHardDeleteOpen}
        onConfirm={confirmHardDelete}
        isSubmitting={isSubmitting}
        title={`Xóa vĩnh viễn chi nhánh "${selectedItem?.branchName}"?`}
        description="Hành động này không thể hoàn tác. Chi nhánh sẽ bị xóa vĩnh viễn khỏi hệ thống."
        confirmLabel="Xóa vĩnh viễn"
        variant="destructive"
      />
    </div>
  )
}

// Component hiển thị actions cho chi nhánh đã ngưng
function DeletedBranchActions({ 
  branch, 
  onRestore, 
  onHardDelete 
}: { 
  branch: Branch
  onRestore: (branch: Branch) => void
  onHardDelete: (branch: Branch) => void
}) {
  const [canDelete, setCanDelete] = React.useState<boolean | null>(null)
  const [checking, setChecking] = React.useState(true)

  React.useEffect(() => {
    const checkCanDelete = async () => {
      setChecking(true)
      try {
        const res = await branchService.checkCanDelete(branch._id)
        if (res.success && res.data) {
          setCanDelete(res.data.canDelete)
        }
      } catch (error) {
        console.error("Failed to check can delete:", error)
        setCanDelete(false)
      } finally {
        setChecking(false)
      }
    }
    checkCanDelete()
  }, [branch._id])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onRestore(branch)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Khôi phục
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onHardDelete(branch)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa vĩnh viễn
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
