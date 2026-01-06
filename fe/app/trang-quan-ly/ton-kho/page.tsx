"use client"

import * as React from "react"
import { CommonTable } from "@/components/common/common-table"
import { BranchProduct as IBranchProduct } from "@/service/stock.service" 
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RowActions } from "@/components/common/row-actions"
import { DetailModal } from "@/components/common/detail-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 
import { format } from "date-fns"
import stockService from "@/service/stock.service"
import branchService, { Branch } from "@/service/branch.service"
import productService, { Product } from "@/service/product.service"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

export default function Page() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [data, setData] = React.useState<IBranchProduct[]>([])
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  
  const [selectedItem, setSelectedItem] = React.useState<IBranchProduct | null>(null)
  
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isEdit, setIsEdit] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const [stockItems, setStockItems] = React.useState<{ productId: string; stock: number; minStock: number }[]>([])
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("")

  // Fetch initial data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await stockService.getAll()
      if (res.data) {
        setData(res.data)
      }
    } catch (error) {
      console.error(error)
      toast.error("Không thể tải dữ liệu tồn kho")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDependencies = React.useCallback(async () => {
    try {
        const [branchRes, productRes] = await Promise.all([
            branchService.getAll(),
            productService.getAll()
        ])
        if (branchRes.data) setBranches(branchRes.data)
        if (productRes.data) setProducts(productRes.data)
    } catch (error) {
        console.error("Failed to fetch dependencies", error)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
    fetchDependencies()
  }, [fetchData, fetchDependencies])

  const handleCreate = () => {
    setSelectedItem(null)
    setSelectedBranchId("")
    setStockItems([{ productId: "", stock: 0, minStock: 10 }])
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleView = (item: IBranchProduct) => {
    setSelectedItem(item)
    setSelectedBranchId(item.branchId?._id || "")
    setStockItems([{
        productId: item.productId?._id || "",
        stock: item.stock,
        minStock: item.minStock
    }])
    setIsEdit(false)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: IBranchProduct) => {
    setSelectedItem(item)
    setSelectedBranchId(item.branchId?._id || "")
    setStockItems([{
        productId: item.productId?._id || "",
        stock: item.stock,
        minStock: item.minStock
    }])
    setIsEdit(true)
    setIsDetailOpen(true)
  }

  const handleDelete = (item: IBranchProduct) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedItem) return
    try {
        await stockService.delete(selectedItem._id)
        toast.success("Đã xóa báo cáo tồn kho thành công")
        fetchData()
    } catch (error: any) {
        toast.error(error?.message || "Xóa thất bại")
    } finally {
        setIsDeleteOpen(false)
        setSelectedItem(null)
    }
  }

  const handleSave = async () => {
      try {
          if (isAdmin && !selectedBranchId && !selectedItem) {
             toast.error("Vui lòng chọn chi nhánh")
             return
          }
          
          if (!stockItems.every(i => i.productId)) {
             toast.error("Vui lòng chọn sản phẩm cho tất cả các dòng")
             return
          }

          if (selectedItem) {
              // Update Single (using stockItems[0])
              await stockService.update(selectedItem._id, {
                  stock: stockItems[0].stock,
                  minStock: stockItems[0].minStock
              })
              toast.success("Cập nhật tồn kho thành công")
          } else {
              // Create Bulk
              await stockService.create({
                  branchId: isAdmin ? selectedBranchId : undefined,
                  items: stockItems
              })
              toast.success("Tạo báo cáo tồn kho thành công")
          }
          setIsDetailOpen(false)
          fetchData()
      } catch (error: any) {
          toast.error(error?.message || "Có lỗi xảy ra")
      }
  }

  const addRow = () => {
      setStockItems([...stockItems, { productId: "", stock: 0, minStock: 10 }])
  }

  const removeRow = (index: number) => {
      if (stockItems.length > 1) {
          const newItems = [...stockItems]
          newItems.splice(index, 1)
          setStockItems(newItems)
      }
  }

  const updateRow = (index: number, field: keyof typeof stockItems[0], value: any) => {
      const newItems = [...stockItems]
      newItems[index] = { ...newItems[index], [field]: value }
      setStockItems(newItems)
  }
  
  const columns = React.useMemo<ColumnDef<IBranchProduct>[]>(() => [
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
        const branch = row.original.branchId
        return branch?.branchName || "N/A"
    }
  },
  {
    accessorKey: "productId",
    header: "Sản phẩm",
     cell: ({ row }) => {
        const product = row.original.productId
        return product?.name || "N/A"
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
            // Admin cannot edit, others can
            onEdit={!isAdmin ? () => handleEdit(row.original) : undefined}
            // Admin can delete, others cannot (implied by "Admin chỉ... xóa thôi")
            onDelete={isAdmin ? () => handleDelete(row.original) : undefined}
        />
    )
  }
  ], [isAdmin])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý tồn kho</h1>
            {!isAdmin && (
                <Button onClick={handleCreate}>+ Báo cáo tồn kho</Button>
            )}
      </div>
      <CommonTable columns={columns} data={data} filterCol="branchId" filterPlaceholder="Lọc..." />
      
        <ConfirmDeleteDialog 
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            onConfirm={confirmDelete}
            title="Xóa báo cáo tồn kho?"
            description="Hành động này sẽ xóa dữ liệu tồn kho của sản phẩm này tại chi nhánh. Bạn có chắc chắn muốn tiếp tục?"
        />

       <DetailModal
         open={isDetailOpen}
         onOpenChange={setIsDetailOpen}
         title={isEdit ? (selectedItem ? "Điều chỉnh tồn kho" : "Tạo báo cáo tồn kho") : "Chi tiết tồn kho"}
         onEdit={!isAdmin && !isEdit ? (() => setIsEdit(true)) : undefined}
         footer={isEdit && (!isAdmin || selectedItem ? true: true) ? (
             <div className="flex justify-end gap-2">
                 <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Hủy</Button>
                 <Button onClick={handleSave}>Lưu</Button>
             </div>
         ) : undefined}
         className="max-w-4xl" // Wider modal for table
       >
          <div className="grid gap-4 py-4">
                {/* Branch Selection (Only for Admin or Readonly Single View) */}
                {(isAdmin || selectedItem) && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Chi nhánh</Label>
                        <div className="col-span-3">
                             {!selectedItem && isAdmin ? (
                                 <Select 
                                    value={selectedBranchId} 
                                    onValueChange={setSelectedBranchId}
                                 >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn chi nhánh" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map(b => (
                                            <SelectItem key={b._id} value={b._id}>{b.branchName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                 </Select>
                            ) : (
                                <Input value={selectedItem?.branchId?.branchName || branches.find(b=>b._id===selectedBranchId)?.branchName || "Chi nhánh hiện tại"} readOnly disabled />
                            )}
                        </div>
                    </div>
                )}

                {/* Items List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <Label>Danh sách sản phẩm</Label>
                         {isEdit && !selectedItem && (
                             <Button size="sm" variant="outline" onClick={addRow}><Plus className="mr-2 h-4 w-4" /> Thêm dòng</Button>
                         )}
                    </div>
                    
                    <div className="rounded-md border p-2">
                         <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium text-muted-foreground px-2">
                             <div className="col-span-5">Sản phẩm</div>
                             <div className="col-span-3">Số lượng</div>
                             <div className="col-span-3">Định mức tối thiểu</div>
                             <div className="col-span-1"></div>
                         </div>
                         
                         {stockItems.map((item, index) => (
                             <div key={index} className="grid grid-cols-12 gap-2 items-center mb-2 px-2">
                                 <div className="col-span-5">
                                      {/* Product Select */}
                                      {!selectedItem && isEdit ? (
                                           <Select 
                                                value={item.productId} 
                                                onValueChange={(val) => updateRow(index, 'productId', val)}
                                           >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn sản phẩm" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => (
                                                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                           </Select>
                                      ) : (
                                         <Input value={selectedItem?.productId?.name || products.find(p => p._id === item.productId)?.name || ""} readOnly disabled />
                                      )}
                                 </div>
                                 <div className="col-span-3">
                                     <Input 
                                        type="number" 
                                        min={0}
                                        value={item.stock}
                                        onChange={(e) => updateRow(index, 'stock', Number(e.target.value))}
                                        readOnly={!isEdit}
                                        disabled={!isEdit}
                                     />
                                 </div>
                                 <div className="col-span-3">
                                     <Input 
                                        type="number" 
                                        min={0}
                                        value={item.minStock}
                                        onChange={(e) => updateRow(index, 'minStock', Number(e.target.value))}
                                        readOnly={!isEdit}
                                        disabled={!isEdit}
                                     />
                                 </div>
                                 <div className="col-span-1 flex justify-center">
                                     {isEdit && !selectedItem && stockItems.length > 1 && (
                                         <Button variant="ghost" size="icon" onClick={() => removeRow(index)} className="text-destructive">
                                             <Trash2 className="h-4 w-4" />
                                         </Button>
                                     )}
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
          </div>
       </DetailModal>
    </div>
  )
}
