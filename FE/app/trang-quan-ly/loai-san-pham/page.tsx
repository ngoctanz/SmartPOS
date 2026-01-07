"use client";

import * as React from "react";
import { CommonTable } from "@/components/common/common-table";
import { Category } from "@/types/category";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DetailModal } from "@/components/common/detail-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { categoryService } from "@/service";
import { StatsCard } from "@/components/common/stats-card";
import { LayoutGrid } from "lucide-react";
import { useTableData } from "@/hooks/useTableData";
import { useStats } from "@/hooks/useStats";

export default function Page() {
  // Use custom hooks
  const { data, loading, searchTerm, pagination, handlePageChange, handleSearch, refetch } = 
    useTableData<Category>({
      fetchFn: categoryService.getAll,
    });

  const { stats } = useStats<{ total: number }>({
    fetchFn: categoryService.getStats,
  });
  
  const [selectedItem, setSelectedItem] = useState<Category | null>(null)
  const [selectedItems, setSelectedItems] = useState<Category[]>([])
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  const [formData, setFormData] = useState<{ name: string; desc: string }>({ name: "", desc: "" })

  const handleCreate = () => {
    setSelectedItem(null);
    setFormData({ name: "", desc: "" });
    setIsEdit(true);
    setIsDetailOpen(true);
  };

  const handleView = (item: Category) => {
    setSelectedItem(item)
    setFormData({ name: item.name, desc: item.desc || "" })
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: Category) => {
    setSelectedItem(item)
    setFormData({ name: item.name, desc: item.desc || "" })
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleDelete = (item: Category) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleDeleteMany = (items: Category[]) => {
    setSelectedItems(items);
    setSelectedItem(null);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
        if (selectedItem) {
            await categoryService.remove(selectedItem._id)
            toast.success("Đã xóa danh mục thành công")
        } else if (selectedItems.length > 0) {
            await categoryService.deleteMany(selectedItems.map(item => item._id))
            toast.success(`Đã xóa ${selectedItems.length} danh mục thành công`)
            setSelectedItems([])
        }
        refetch()
    } catch (error) {
        toast.error("Xóa danh mục thất bại")
        console.error(error)
    } finally {
        setIsDeleteOpen(false)
        setSelectedItem(null)
    }
  };

  const handleSave = async () => {
    try {
      if (selectedItem) {
        await categoryService.update(selectedItem._id, {
          name: formData.name,
          description: formData.desc,
        });
        toast.success("Cập nhật danh mục thành công");
      } else {
        await categoryService.create({
          name: formData.name,
          description: formData.desc,
        });
        toast.success("Tạo danh mục thành công");
      }
      setIsDetailOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const isAnyRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;
          return (
          <RowActions
            onView={() => handleView(row.original)}
            onEdit={() => handleEdit(row.original)}
            onDelete={() => handleDelete(row.original)}
            disabled={isAnyRowSelected}
          />
        )},
      },
    ],
    []
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý loại sản phẩm</h1>
            <div className="flex gap-2">
                <Button onClick={handleCreate}>+ Thêm mới</Button>
            </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Tổng danh mục"
          value={stats?.total || 0}
          icon={LayoutGrid}
          description="Số lượng danh mục sản phẩm"
        />
      </div>

      <CommonTable 
        columns={columns} 
        data={data} 
        filterCol="name" 
        filterPlaceholder="Tìm loại sản phẩm..." 
        onBulkAction={handleDeleteMany}
        bulkActionLabel="Xóa đã chọn"
        bulkActionIcon="trash"
        serverPagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchValue={searchTerm}
      />
      
       <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title={selectedItem ? `Xóa danh mục ${selectedItem?.name}?` : `Xóa ${selectedItems.length} danh mục đang chọn?`}
        description={selectedItem ? undefined : "Hành động này sẽ xóa tất cả các danh mục đã chọn. Bạn có chắc chắn muốn tiếp tục?"}
      />

      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={
          isEdit
            ? selectedItem
              ? "Chỉnh sửa danh mục"
              : "Thêm mới danh mục"
            : "Chi tiết danh mục"
        }
        onEdit={!isEdit ? () => setIsEdit(true) : undefined}
        footer={
          isEdit ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSave}>Lưu</Button>
            </div>
          ) : undefined
        }
      >
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Tên loại</Label>
                <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="col-span-3" 
                    readOnly={!isEdit} 
                    disabled={!isEdit}
                    placeholder="Nhập tên loại sản phẩm"
                />
            </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Mô tả</Label>
                    <Input 
                        value={formData.desc}
                        onChange={(e) => setFormData({...formData, desc: e.target.value})}
                        className="col-span-3" 
                        readOnly={!isEdit} 
                        disabled={!isEdit}
                        placeholder="Nhập mô tả"
                    />
                </div>
        </div>
      </DetailModal>
    </div>
  );
}
