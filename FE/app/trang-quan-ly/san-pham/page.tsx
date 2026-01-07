"use client";

import * as React from "react";
import { CommonTable } from "@/components/common/common-table";
import { Product } from "@/service/product.service";
import { Category } from "@/service/category.service";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DetailModal } from "@/components/common/detail-modal";
import { ProductFormModal } from "@/components/forms/product-form-modal";
import { ProductStats } from "@/components/common/product-stats";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Loader2,
  Plus,
  Package,
  Barcode as BarcodeIcon,
  ChartBar,
} from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import productService, {
  CreateProductRequest,
  UpdateProductRequest,
} from "@/service/product.service";
import categoryService from "@/service/category.service";
import Barcode from "react-barcode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilteredTableData } from "@/hooks/useFilteredTableData";
import { eventBus, Events } from "@/lib/data-events";

const getCategoryName = (categoryId: Product["categoryId"]): string => {
  if (typeof categoryId === "object" && categoryId?.name) {
    return categoryId.name;
  }
  return String(categoryId || "---");
};

export default function Page() {
  // Use custom hooks
  const { 
    data, 
    loading, 
    searchTerm, 
    pagination, 
    filters,
    handlePageChange, 
    handleSearch,
    updateFilter,
    refetch 
  } = useFilteredTableData<Product, { status?: string; categoryId?: string }>({
    fetchFn: productService.getAll,
    initialFilters: { status: undefined, categoryId: undefined },
  });

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<Product | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Product[]>([]);
  const [showStats, setShowStats] = React.useState(true);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch categories
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getAll();
        if (res.data) {
          setCategories(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Handlers
  const handleView = (item: Product) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Product) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = (item: Product) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleDeleteMany = (items: Product[]) => {
    setSelectedItems(items);
    setSelectedItem(null);
    setIsDeleteOpen(true);
  };

  // Form submit
  const handleFormSubmit = async (
    formData: CreateProductRequest | UpdateProductRequest
  ) => {
    try {
      setIsSubmitting(true);
      if (selectedItem) {
        await productService.update(selectedItem._id, formData);
        toast.success("Cập nhật sản phẩm thành công!");
      } else {
        await productService.create(formData as CreateProductRequest);
        toast.success("Thêm sản phẩm thành công!");
      }
      setIsFormOpen(false);
      setSelectedItem(null);
      refetch();
      eventBus.emit(Events.DATA_CHANGED);
    } catch (error: unknown) {
      console.error("Form submit error:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete confirm
  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      if (selectedItem) {
        await productService.remove(selectedItem._id);
        toast.success("Đã xóa sản phẩm thành công");
      } else if (selectedItems.length > 0) {
        const ids = selectedItems.map((item) => item._id);
        await productService.removeMany(ids);
        toast.success(`Đã xóa ${selectedItems.length} sản phẩm thành công`);
        setSelectedItems([]);
      }
      setIsDeleteOpen(false);
      setSelectedItem(null);
      refetch();
      eventBus.emit(Events.DATA_CHANGED);
    } catch (error: unknown) {
      console.error("Delete error:", error);

      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
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
        accessorKey: "image",
        header: "Hình ảnh",
        cell: ({ row }) => {
          const img = row.getValue("image") as string;
          if (!img) {
            return (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            );
          }
          return (
            <img
              src={img}
              alt="Product"
              className="h-10 w-10 rounded object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          );
        },
        size: 60,
      },
      {
        accessorKey: "barcode",
        header: "Mã vạch",
        cell: ({ row }) => {
          const barcode = row.getValue("barcode") as string;
          if (!barcode) {
            return <span className="text-xs text-muted-foreground">---</span>;
          }
          return (
            <div className="flex items-center">
              <Barcode
                value={barcode}
                width={1.5}
                height={40}
                fontSize={12}
                margin={5}
                displayValue={true}
              />
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: "name",
        header: "Tên sản phẩm",
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <p className="font-medium truncate">{row.getValue("name")}</p>
          </div>
        ),
      },
      {
        accessorKey: "categoryId",
        header: "Loại",
        cell: ({ row }) => (
          <Badge variant="outline">{getCategoryName(row.original.categoryId)}</Badge>
        ),
      },
      {
        accessorKey: "unit",
        header: "Đơn vị",
      },
      {
        accessorKey: "currentSalePrice",
        header: "Giá bán",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.getValue("currentSalePrice"))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge variant={status === "active" ? "default" : "secondary"}>
              {status === "active" ? "Đang bán" : "Ngừng bán"}
            </Badge>
          );
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
          );
        },
      },
    ],
    []
  );

  const toolbarActions = (
    <>
      <Select 
        value={filters.categoryId || "all"} 
        onValueChange={(value) => updateFilter("categoryId", value === "all" ? undefined : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Danh mục" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả danh mục</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat._id} value={cat._id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={filters.status || "all"} 
        onValueChange={(value) => updateFilter("status", value === "all" ? undefined : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="active">Đang bán</SelectItem>
          <SelectItem value="inactive">Ngừng bán</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quản lý sản phẩm</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={showStats ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <ChartBar className="mr-2 h-4 w-4" />
            {showStats ? "Ẩn thống kê" : "Hiện thống kê"}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {showStats && <ProductStats products={data} categories={categories} />}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={data}
          filterCol="name"
          filterPlaceholder="Tìm sản phẩm (Tên, Barcode)..."
          onBulkAction={handleDeleteMany}
          bulkActionLabel="Xóa đã chọn"
          bulkActionIcon="trash"
          toolbarActions={toolbarActions}
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
        />
      )}

      {/* Form Modal */}
      <ProductFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedItem}
        categories={categories}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirm */}
      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title={
          selectedItem
            ? `Xóa sản phẩm "${selectedItem.name}"?`
            : `Xóa ${selectedItems.length} sản phẩm đã chọn?`
        }
        description="Sản phẩm sẽ bị xóa khỏi hệ thống. Bạn không thể hoàn tác hành động này."
      />

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết sản phẩm"
        className="max-w-[95vw] sm:max-w-[800px]"
        onEdit={() => {
          setIsDetailOpen(false);
          if (selectedItem) handleEdit(selectedItem);
        }}
      >
        {selectedItem && (
          <div className="grid gap-6 py-4 lg:grid-cols-[240px_1fr]">
            {/* Left Column: Image & Barcode */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative h-64 w-full overflow-hidden rounded-lg border bg-muted">
                {selectedItem.image ? (
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Barcode Section */}
              {selectedItem.barcode && (
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-white">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BarcodeIcon className="h-4 w-4" />
                    <span>Mã vạch sản phẩm</span>
                  </div>
                  <Barcode
                    value={selectedItem.barcode}
                    width={2}
                    height={60}
                    fontSize={14}
                    margin={5}
                    displayValue={true}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Info */}
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {selectedItem.name}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                    {getCategoryName(selectedItem.categoryId)}
                  </Badge>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    Đơn vị: {selectedItem.unit}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Giá bán
                  </span>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedItem.currentSalePrice)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Trạng thái
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-2 w-2 rounded-full ${
                        selectedItem.status === "active" ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="font-medium">
                      {selectedItem.status === "active" ? "Đang bán" : "Ngừng bán"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold leading-none tracking-tight">Mô tả</h3>
                <div className="rounded-md border bg-muted/10 p-4 text-sm leading-relaxed text-muted-foreground">
                  {selectedItem.desc || (
                    <span className="italic">Chưa có mô tả cho sản phẩm này.</span>
                  )}
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Ngày tạo: </span>
                  {format(new Date(selectedItem.createdAt), "dd/MM/yyyy HH:mm")}
                </div>
                <div>
                  <span className="font-medium text-foreground">Cập nhật cuối: </span>
                  {format(new Date(selectedItem.updatedAt), "dd/MM/yyyy HH:mm")}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
