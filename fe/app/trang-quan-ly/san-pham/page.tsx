"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { mockProducts, mockCategories } from "@/mock/index"
import { Product } from "@/types/product"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { RowActions } from "@/components/common/row-actions"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { toast } from "sonner" 
import { format } from "date-fns"
import Barcode from "react-barcode"

export default function Page() {
  const [data, setData] = React.useState<Product[]>(mockProducts)
  const [selectedItem, setSelectedItem] = React.useState<Product | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | undefined>(undefined)
  
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  
  const handleView = (item: Product) => {
    setSelectedItem(item)
    setImagePreview(item.image)
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: Product) => {
    setSelectedItem(item)
    setImagePreview(item.image)
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
        const url = URL.createObjectURL(file)
        setImagePreview(url)
    }
  }

  const handleDelete = (item: Product) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (selectedItem) {
        setData(data.filter(i => i._id !== selectedItem._id))
        setIsDeleteOpen(false)
        setSelectedItem(null)
        toast.success("Đã xóa sản phẩm thành công")
    }
  }

  const columns = React.useMemo<ColumnDef<Product>[]>(() => [
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
    accessorKey: "barcode",
    header: "Mã vạch",
  },
  {
    accessorKey: "image",
    header: "Hình ảnh",
    cell: ({ row }) => {
        const img = row.getValue("image") as string;
        if (!img) return null;
        return <img src={img} alt="Product" className="h-10 w-10 object-cover rounded" />
    }
  },
  {
    accessorKey: "name",
    header: "Tên sản phẩm",
  },
  {
    accessorKey: "categoryId",
    header: "Loại",
    cell: ({ row }) => {
        const catId = row.getValue("categoryId");
        const category = mockCategories.find(c => c._id === catId);
        return category ? category.name : catId;
    }
  },
  {
    accessorKey: "unit",
    header: "Đơn vị",
  },
  {
    accessorKey: "currentSalePrice",
    header: "Giá bán",
    cell: ({ row }) => {
        const price = parseFloat(row.getValue("currentSalePrice"));
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    }
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
            <h1 className="text-2xl font-bold tracking-tight">Quản lý sản phẩm</h1>
      </div>
      <CommonTable columns={columns} data={data} filterCol="name" filterPlaceholder="Tìm sản phẩm..." />
      
      <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title={`Xóa sản phẩm ${selectedItem?.name}?`}
      />

       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title={isEdit ? "Chỉnh sửa sản phẩm" : "Chi tiết sản phẩm"}
         onEdit={!isEdit ? (() => setIsEdit(true)) : undefined}
       >
         {selectedItem && (
            <div className="grid gap-6 py-4">
                 <div className="flex flex-col items-center justify-center gap-4">
                    {imagePreview ? (
                        <div className="relative h-40 w-40 overflow-hidden rounded-md border">
                            <img src={imagePreview} alt="Product" className="h-full w-full object-cover" />
                        </div>
                    ) : (
                        <div className="flex h-40 w-40 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            No Image
                        </div>
                    )}
                    {isEdit && (
                         <div className="w-full max-w-xs">
                             <Label className="mb-2 block text-sm">Upload Image</Label>
                             <Input 
                                type="file" 
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="cursor-pointer"
                             />
                         </div>
                    )}
                 </div>

                 <div className="grid grid-cols-4 items-center gap-6">
                    <Label className="text-right">Mã vạch</Label>
                    <div className="col-span-3">
                         <Input defaultValue={selectedItem.barcode} readOnly={!isEdit} disabled={!isEdit} className="mb-2" />
                         <div className="flex justify-center rounded border p-2 bg-white">
                            <Barcode value={selectedItem.barcode || "NO DATA"} width={1.5} height={50} fontSize={14} />
                         </div>
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-6">
                    <Label className="text-right">Tên sản phẩm</Label>
                    <Input defaultValue={selectedItem.name} className="col-span-3 h-10" readOnly={!isEdit} disabled={!isEdit} />
                </div>
                <div className="grid grid-cols-4 items-center gap-6">
                    <Label className="text-right">Giá bán</Label>
                    <Input defaultValue={selectedItem.currentSalePrice} type="number" className="col-span-3 h-10" readOnly={!isEdit} disabled={!isEdit} />
                </div>
                <div className="grid grid-cols-4 items-center gap-6">
                    <Label className="text-right">Đơn vị</Label>
                    <Input defaultValue={selectedItem.unit} className="col-span-3 h-10" readOnly={!isEdit} disabled={!isEdit} />
                </div>
            </div>
         )}
       </DetailModal>
    </div>
  )
}
