"use client";

import * as React from "react";
import {
  CommonTable,
  ServerPagination,
} from "@/components/common/common-table";
import {
  BranchProduct as IBranchProduct,
  BranchProductStats,
} from "@/service/stock.service";
import { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { ProductDetailModal, ProductNoteModal } from "@/components/product";
import {
  ProductFormModal,
  InventoryProductFormData,
} from "@/components/forms/product-form-modal";
import { format } from "date-fns";
import stockService from "@/service/stock.service";
import branchService, { Branch } from "@/service/branch.service";
import categoryService, { Category } from "@/service/category.service";
import productService, {
  CreateProductRequest,
  UpdateProductRequest,
  Product,
} from "@/service/product.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  LayoutGrid,
  Boxes,
  FileEdit,
  FileSpreadsheet,
  ChartBar,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { StatsCard } from "@/components/common/stats-card";
import { Button } from "@/components/ui/button";
import Barcode from "react-barcode";
import { ImportReceiptExcelModal } from "@/components/forms/import-receipt-excel-modal";
import { ExportProductsButton } from "@/components/common/export-products-button";
import { eventBus, Events } from "@/lib/data-events";

export default function Page() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEditProduct = isAdmin || user?.role === "manager";

  // Data state
  const [data, setData] = React.useState<IBranchProduct[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<BranchProductStats>({
    totalItems: 0,
    totalQuantity: 0,
    lowStockCount: 0,
  });

  // Filter state
  const [filterBranchId, setFilterBranchId] = React.useState<string>("all");
  const [filterLowStock, setFilterLowStock] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [showStats, setShowStats] = React.useState(true);

  // Pagination state
  const [pagination, setPagination] = React.useState<ServerPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Modal state
  const [selectedItem, setSelectedItem] = React.useState<IBranchProduct | null>(
    null,
  );
  const [selectedItems, setSelectedItems] = React.useState<IBranchProduct[]>(
    [],
  );
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = React.useState(false);
  const [isImportStockExcelOpen, setIsImportStockExcelOpen] =
    React.useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(
    null,
  );
  const [editingBranchProductId, setEditingBranchProductId] = React.useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      "productId.categoryId": false,
      "productId.unit": false,
      minStock: false,
      lastImportPrice: false,
    });

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filter changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filterBranchId, filterLowStock]);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const effectiveBranchId = isAdmin
        ? filterBranchId !== "all"
          ? filterBranchId
          : undefined
        : user.branchId;

      const params = {
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
        lowStockOnly: filterLowStock === "low",
      };

      const stockPromise =
        isAdmin && filterBranchId === "all"
          ? stockService.getAggregatedByProduct(params)
          : effectiveBranchId
            ? stockService.getByBranch(effectiveBranchId, params)
            : stockService.getAll(params);

      const [res, statsRes] = await Promise.all([
        stockPromise,
        stockService.getStats(effectiveBranchId),
      ]);

      if (res.data) setData(res.data);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination!.total,
          totalPages: res.pagination!.totalPages,
        }));
      }
      if (statsRes.data) setStats(statsRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải dữ liệu tồn kho");
    } finally {
      setLoading(false);
    }
  }, [
    isAdmin,
    filterBranchId,
    debouncedSearch,
    pagination.page,
    pagination.limit,
    filterLowStock,
    user,
  ]);

  // Fetch branches and categories
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesRes, branchesRes] = await Promise.all([
          categoryService.getAll(),
          isAdmin ? branchService.getAll() : Promise.resolve({ data: [] }),
        ]);
        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (branchesRes.data) setBranches(branchesRes.data);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };
    fetchInitialData();
  }, [isAdmin]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleView = (item: IBranchProduct) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleEditNote = (item: IBranchProduct) => {
    setSelectedItem(item);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (note: string) => {
    if (!selectedItem) return;

    try {
      setIsSubmitting(true);

      // Determine branchId based on context
      let branchId: string | undefined;

      if (isAdmin) {
        // Admin: use filter branchId if specific branch selected, otherwise extract from item
        if (filterBranchId !== "all") {
          branchId = filterBranchId;
        } else if (selectedItem.branchId) {
          // Extract branchId from populated or string format
          branchId =
            typeof selectedItem.branchId === "string"
              ? selectedItem.branchId
              : selectedItem.branchId._id;
        }
      }
      // Staff/Manager: branchId will be injected by middleware, no need to send

      await stockService.updateNote(selectedItem._id, note, branchId);
      toast.success("Đã cập nhật ghi chú");
      setIsNoteModalOpen(false);
      setSelectedItem(null);
      fetchData();
      eventBus.emit(Events.DATA_CHANGED);
    } catch (error) {
      console.error("Update note error:", error);
      toast.error("Không thể cập nhật ghi chú");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setEditingBranchProductId(null);
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (item: IBranchProduct) => {
    const isAggregated = item.isAggregated;

    // Extract branchId safely from populated or string format
    const extractedBranchId = item.branchId
      ? typeof item.branchId === "string"
        ? item.branchId
        : item.branchId._id
      : "";

    const productData = {
      ...item.productId,
      currentSalePrice: isAggregated
        ? item.productId.currentSalePrice
        : item.salePrice,
      lastImportPrice: isAggregated ? 0 : item.lastImportPrice || 0,
      productCode: isAggregated ? "" : item.productCode || "",
      branchId: isAggregated ? "" : extractedBranchId,
      // CRITICAL: Status logic
      // - Aggregated mode: use Product.status (global status) - CANNOT EDIT
      // - Branch mode: use BranchProduct.status (branch-specific status) - CAN EDIT
      status: isAggregated
        ? item.productId.status || "active"
        : item.status || "active",
    };

    setEditingProduct(productData as Product);
    setEditingBranchProductId(isAggregated ? null : item._id);
    // Store branchId for later use in update
    if (!isAggregated && extractedBranchId) {
      (productData as any)._editingBranchId = extractedBranchId;
    }
    setIsProductFormOpen(true);
  };

  const handleProductFormSubmit = async (
    formData:
      | CreateProductRequest
      | UpdateProductRequest
      | InventoryProductFormData,
  ) => {
    try {
      setIsSubmitting(true);

      if (editingProduct) {
        // EDIT MODE
        const productUpdateData: UpdateProductRequest = {
          name: formData.name,
          categoryId: formData.categoryId,
          unit: formData.unit,
          barcode: formData.barcode,
          desc: formData.desc,
          images: formData.images,
          // CRITICAL: Only update Product.status if NOT editing branch-specific
          // Product.status = global status, only updated when editing product itself (not branch)
          status: editingBranchProductId ? undefined : formData.status,
        };

        // Remove undefined fields
        Object.keys(productUpdateData).forEach((key) => {
          const typedKey = key as keyof UpdateProductRequest;
          if (productUpdateData[typedKey] === undefined) {
            delete productUpdateData[typedKey];
          }
        });

        await productService.update(editingProduct._id, productUpdateData);

        if (editingBranchProductId) {
          // BRANCH-SPECIFIC UPDATE
          const invData = formData as InventoryProductFormData;
          const updateData: any = {
            salePrice: invData.currentSalePrice,
            lastImportPrice: invData.importPrice,
            productCode: invData.productCode,
          };

          // Include stock (quantity) if provided
          if (invData.quantity !== undefined) {
            updateData.stock = invData.quantity;
          }

          // Admin needs to send branchId for write operations
          const branchIdForUpdate =
            isAdmin && (editingProduct as any)._editingBranchId
              ? (editingProduct as any)._editingBranchId
              : undefined;

          if (branchIdForUpdate) {
            updateData.branchId = branchIdForUpdate;
          }

          await stockService.update(editingBranchProductId, updateData);

          // CRITICAL: Update BranchProduct.status separately (branch-specific status)
          if (formData.status) {
            await stockService.updateStatus(
              editingBranchProductId,
              formData.status,
              branchIdForUpdate,
            );
          }

          toast.success("Cập nhật sản phẩm & cấu hình chi nhánh thành công!");
        } else {
          // PRODUCT-ONLY UPDATE (global status was updated above)
          toast.success("Cập nhật thông tin sản phẩm thành công!");
        }
      } else {
        // CREATE MODE
        const inventoryData = formData as InventoryProductFormData;
        if (isAdmin && inventoryData.branchId) {
          await stockService.createProductWithStock({
            name: inventoryData.name,
            barcode: inventoryData.barcode,
            categoryId: inventoryData.categoryId,
            unit: inventoryData.unit,
            currentSalePrice: inventoryData.currentSalePrice,
            status: inventoryData.status,
            desc: inventoryData.desc,
            images: inventoryData.images,
            branchId: inventoryData.branchId,
            productCode: inventoryData.productCode,
            salePrice: inventoryData.currentSalePrice,
            importPrice: inventoryData.importPrice,
            stock: inventoryData.quantity, // Initial stock quantity
          });
          toast.success("Thêm sản phẩm vào kho chi nhánh thành công!");
        } else {
          await productService.create(formData as CreateProductRequest);
          toast.success("Thêm sản phẩm thành công!");
        }
      }

      setIsProductFormOpen(false);
      fetchData();
      eventBus.emit(Events.DATA_CHANGED);
    } catch (error: unknown) {
      console.error("Form submit error:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMany = (items: IBranchProduct[]) => {
    setSelectedItems(items);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await Promise.all(
        selectedItems.map((item) => stockService.delete(item._id)),
      );
      toast.success(`Đã xóa ${selectedItems.length} sản phẩm khỏi kho`);
      setSelectedItems([]);
      setIsDeleteOpen(false);
      fetchData();
      eventBus.emit(Events.DATA_CHANGED);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Có lỗi xảy ra khi xóa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showBranchCountColumn = isAdmin && filterBranchId === "all";

  const columns = React.useMemo<ColumnDef<IBranchProduct>[]>(
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
        accessorKey: "productId",
        header: "Sản phẩm",
        cell: ({ row }) => {
          const product = row.original.productId;
          const imageUrl = product?.images?.[0] || product?.image;
          return (
            <div className="flex items-start gap-3 min-w-[220px] max-w-[350px]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight whitespace-normal break-words">
                  {product?.name || "N/A"}
                </p>
              </div>
            </div>
          );
        },
        enableHiding: false,
        size: 300,
      },
      {
        id: "productId.barcode",
        accessorFn: (row) => row.productId?.barcode,
        header: "Mã vạch",
        cell: ({ row }) => {
          const barcode = row.original.productId?.barcode;
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
      ...(!showBranchCountColumn
        ? [
            {
              accessorKey: "productCode",
              header: "Mã hàng",
              cell: ({ row }: { row: { original: IBranchProduct } }) => {
                const productCode = row.original.productCode;
                return (
                  <span className="font-mono text-sm">
                    {productCode || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                );
              },
            } as ColumnDef<IBranchProduct>,
          ]
        : []),
      {
        id: "productId.categoryId",
        accessorFn: (row) => row.productId?.categoryId,
        header: "Loại sản phẩm",
        cell: ({ row }) => {
          const category = row.original.productId?.categoryId;
          let categoryName = "—";
          
          if (category) {
            if (typeof category === "object" && category?.name) {
              categoryName = category.name;
            } else if (typeof category === "string") {
              // Fallback: if it's just an ID string
              categoryName = category;
            }
          }
          
          return <Badge variant="outline">{categoryName}</Badge>;
        },
      },
      {
        id: "productId.unit",
        accessorFn: (row) => row.productId?.unit,
        header: "Đơn vị",
        cell: ({ row }) => {
          const unit = row.original.productId?.unit || "—";
          return <span className="text-sm">{unit}</span>;
        },
      },
      ...(showBranchCountColumn
        ? [
            {
              accessorKey: "branchCount",
              header: "Số chi nhánh",
              cell: ({ row }: { row: { original: IBranchProduct } }) => {
                const count = row.original.branchCount || 0;
                return (
                  <Badge variant="secondary" className="gap-1">
                    <LayoutGrid className="h-3 w-3" />
                    {count} chi nhánh
                  </Badge>
                );
              },
            } as ColumnDef<IBranchProduct>,
          ]
        : []),
      {
        accessorKey: "stock",
        header: showBranchCountColumn ? "Tổng tồn kho" : "Tồn kho",
        cell: ({ row }) => {
          const stock = row.getValue("stock") as number;

          if (showBranchCountColumn) {
            const isOutOfStock = stock <= 0;
            const isLow = !isOutOfStock && stock <= 5;
            return (
              <div className="flex items-center gap-2">
                <span
                  className={
                    isOutOfStock || isLow ? "text-destructive font-medium" : ""
                  }
                >
                  {stock}
                </span>
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Hết hàng
                  </Badge>
                )}
                {isLow && (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Sắp hết
                  </Badge>
                )}
              </div>
            );
          }

          const minStock = row.original.minStock;
          const isOutOfStock = stock <= 0;
          const isLow = !isOutOfStock && stock <= minStock;
          return (
            <div className="flex items-center gap-2">
              <span
                className={
                  isOutOfStock || isLow ? "text-destructive font-medium" : ""
                }
              >
                {stock}
              </span>
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Hết hàng
                </Badge>
              )}
              {isLow && (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Sắp hết
                </Badge>
              )}
            </div>
          );
        },
      },
      ...(!showBranchCountColumn
        ? [
            {
              accessorKey: "minStock",
              header: "Định mức tối thiểu",
            } as ColumnDef<IBranchProduct>,
          ]
        : []),
      ...(!showBranchCountColumn
        ? [
            {
              accessorKey: "salePrice",
              header: "Giá bán",
              cell: ({ row }: { row: { original: IBranchProduct } }) => {
                const salePrice = row.original.salePrice;
                return (
                  <span className="font-medium text-primary">
                    {formatCurrency(salePrice || 0)}
                  </span>
                );
              },
            } as ColumnDef<IBranchProduct>,
            {
              accessorKey: "lastImportPrice",
              header: "Giá nhập gần nhất",
              cell: ({ row }: { row: { original: IBranchProduct } }) => {
                const lastImportPrice = row.original.lastImportPrice;
                return (
                  <span className="text-sm text-muted-foreground">
                    {lastImportPrice ? formatCurrency(lastImportPrice) : "—"}
                  </span>
                );
              },
            } as ColumnDef<IBranchProduct>,
          ]
        : []),
      ...(!showBranchCountColumn
        ? [
            {
              accessorKey: "note",
              header: "Ghi chú",
              cell: ({ row }: { row: { original: IBranchProduct } }) => {
                const note = row.original.note;
                return (
                  <span className="text-sm max-w-[200px] truncate block">
                    {note || <span className="text-muted-foreground">—</span>}
                  </span>
                );
              },
            } as ColumnDef<IBranchProduct>,
          ]
        : []),
      {
        accessorKey: "updatedAt",
        header: "Cập nhật",
        cell: ({ row }) => {
          try {
            return format(
              new Date(row.getValue("updatedAt")),
              "dd/MM/yyyy HH:mm",
            );
          } catch {
            return "—";
          }
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const isAnyRowSelected =
            table.getFilteredSelectedRowModel().rows.length > 0;
          const isAggregated = row.original.isAggregated;

          return (
            <RowActions
              onView={() => handleView(row.original)}
              onEdit={
                canEditProduct
                  ? () => handleEditProduct(row.original)
                  : undefined
              }
              editLabel="Chỉnh sửa"
              customActions={
                !isAggregated
                  ? [
                      {
                        label: "Cập nhật ghi chú",
                        icon: <FileEdit className="h-4 w-4" />,
                        onClick: () => handleEditNote(row.original),
                      },
                    ]
                  : undefined
              }
              disabled={isAnyRowSelected}
            />
          );
        },
      },
    ],
    [showBranchCountColumn, canEditProduct],
  );

  const toolbarActions = React.useMemo(
    () => (
      <>
        {isAdmin && (
          <Select value={filterBranchId} onValueChange={setFilterBranchId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tất cả chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chi nhánh</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch._id} value={branch._id}>
                  {branch.branchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterLowStock} onValueChange={setFilterLowStock}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái tồn kho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="low">Sắp hết hàng</SelectItem>
          </SelectContent>
        </Select>
      </>
    ),
    [isAdmin, filterBranchId, filterLowStock, branches],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Quản lý sản phẩm
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant={showStats ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <ChartBar className="mr-2 h-4 w-4" />
            {showStats ? "Ẩn thống kê" : "Hiện thống kê"}
          </Button>
          <ExportProductsButton
            isAggregatedView={filterBranchId === "all"}
            branchId={filterBranchId !== "all" ? filterBranchId : undefined}
            filters={{
              search: searchTerm,
              lowStockOnly: filterLowStock === "low",
            }}
          />
          <Button
            variant="outline"
            onClick={() => setIsImportStockExcelOpen(true)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Nhập kho Excel
          </Button>
          <Button onClick={handleCreateProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {showStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatsCard
            title="Tổng mặt hàng"
            value={stats.totalItems}
            icon={Package}
            description="Số lượng mặt hàng đang quản lý"
          />
          <StatsCard
            title="Tổng số lượng"
            value={stats.totalQuantity}
            icon={Boxes}
            description="Tổng số lượng sản phẩm tất cả các loại"
          />
          <StatsCard
            title="Sắp hết hàng"
            value={stats.lowStockCount}
            icon={AlertTriangle}
            description="Sản phẩm dưới định mức tối thiểu"
            trend={stats.lowStockCount > 0 ? "critical" : "neutral"}
          />
        </div>
      )}

      <CommonTable
        columns={columns}
        data={data}
        filterCol="productId"
        filterPlaceholder="Tìm theo tên, mã vạch hoặc mã hàng..."
        serverPagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onBulkAction={handleDeleteMany}
        bulkActionLabel="Xóa đã chọn"
        bulkActionIcon="trash"
        toolbarActions={toolbarActions}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        isLoading={loading}
        getRowClassName={(row) => {
          // Aggregated view: use Product.status (global status)
          // Branch view: use BranchProduct.status (branch-specific status)
          const status = row.isAggregated ? row.productId?.status : row.status;
          return status === "inactive" ? "opacity-50" : "";
        }}
      />

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title={`Xóa ${selectedItems.length} mục tồn kho?`}
        description="Hành động này sẽ xóa dữ liệu tồn kho của các sản phẩm đã chọn khỏi chi nhánh."
      />

      <ProductDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        product={selectedItem}
      />

      <ProductNoteModal
        open={isNoteModalOpen}
        onOpenChange={setIsNoteModalOpen}
        product={selectedItem}
        onSave={handleSaveNote}
        isSubmitting={isSubmitting}
      />

      {/* Product Form Modal - Thêm sản phẩm mới */}
      <ProductFormModal
        open={isProductFormOpen}
        onOpenChange={setIsProductFormOpen}
        product={editingProduct}
        categories={categories}
        onSubmit={handleProductFormSubmit}
        isSubmitting={isSubmitting}
        // Chỉ hiện inventory fields khi tạo mới và là admin
        // HOẶC khi đang edit specific branch product (để sửa giá bán/giá nhập)
        isInventoryMode={!editingProduct || !!editingBranchProductId}
        branches={branches}
        isAdmin={isAdmin}
        // Aggregated edit mode: chỉ cho sửa thông tin chung, không cho sửa giá
        isAggregatedEdit={!!editingProduct && !editingBranchProductId}
      />

      {/* Import Stock Excel Modal - Nhập kho */}
      <ImportReceiptExcelModal
        open={isImportStockExcelOpen}
        onOpenChange={setIsImportStockExcelOpen}
        onSuccess={() => {
          setIsImportStockExcelOpen(false);
          fetchData();
          eventBus.emit(Events.DATA_CHANGED);
        }}
        branches={branches}
        userBranchId={user?.branchId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
