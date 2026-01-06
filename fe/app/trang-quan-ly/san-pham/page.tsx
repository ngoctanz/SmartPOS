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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Plus, Package, Barcode as BarcodeIcon } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import productService, {
  CreateProductRequest,
  UpdateProductRequest,
} from "@/service/product.service";
import categoryService from "@/service/category.service";
import Barcode from "react-barcode";

// Helper để lấy tên category từ populated field
const getCategoryName = (categoryId: Product["categoryId"]): string => {
  if (typeof categoryId === "object" && categoryId?.name) {
    return categoryId.name;
  }
  return String(categoryId || "---");
};

export default function Page() {
  const [data, setData] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedItem, setSelectedItem] = React.useState<Product | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Product[]>([]);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        productService.getAll(),
        categoryService.getAll(),
      ]);

      if (productsRes.data) {
        setData(productsRes.data);
      }
      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      fetchData();
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
        // Delete multiple using the new bulk API
        const ids = selectedItems.map((item) => item._id);
        await productService.removeMany(ids);
        toast.success(`Đã xóa ${selectedItems.length} sản phẩm thành công`);
        setSelectedItems([]);
      }
      setIsDeleteOpen(false);
      setSelectedItem(null);
      fetchData();
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
                width={1}
                height={30}
                fontSize={10}
                margin={0}
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
          <Badge variant="outline">
            {getCategoryName(row.original.categoryId)}
          </Badge>
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
          const isAnyRowSelected =
            table.getFilteredSelectedRowModel().rows.length > 0;
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quản lý sản phẩm</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={data}
          filterCol="name"
          filterPlaceholder="Tìm sản phẩm..."
          onBulkAction={handleDeleteMany}
          bulkActionLabel="Xóa đã chọn"
          bulkActionIcon="trash"
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
        className="max-w-4xl"
        onEdit={() => {
          setIsDetailOpen(false);
          if (selectedItem) handleEdit(selectedItem);
        }}
      >
        {selectedItem && (
          <div className="grid gap-8 py-4 md:grid-cols-[300px_1fr]">
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
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 text-sm font-normal"
                  >
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
                    <span className={`flex h-2 w-2 rounded-full ${selectedItem.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                    <span className="font-medium">
                      {selectedItem.status === "active" ? "Đang bán" : "Ngừng bán"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold leading-none tracking-tight">
                  Mô tả
                </h3>
                <div className="rounded-md border bg-muted/10 p-4 text-sm leading-relaxed text-muted-foreground">
                  {selectedItem.desc || (
                    <span className="italic">
                      Chưa có mô tả cho sản phẩm này.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">
                    Ngày tạo:{" "}
                  </span>
                  {format(new Date(selectedItem.createdAt), "dd/MM/yyyy HH:mm")}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    Cập nhật cuối:{" "}
                  </span>
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
