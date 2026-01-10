"use client";

import * as React from "react";
import { CommonTable, ServerPagination } from "@/components/common/common-table";
import { BranchProduct as IBranchProduct, BranchProductStats } from "@/service/stock.service";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DetailModal } from "@/components/common/detail-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import stockService from "@/service/stock.service";
import branchService, { Branch } from "@/service/branch.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, AlertTriangle, LayoutGrid, Boxes, FileEdit } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { StatsCard } from "@/components/common/stats-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Page() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [data, setData] = React.useState<IBranchProduct[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<BranchProductStats>({
      totalItems: 0,
      totalQuantity: 0,
      lowStockCount: 0
  });

  // Filter state
  const [filterBranchId, setFilterBranchId] = React.useState<string>("all");
  const [filterLowStock, setFilterLowStock] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Server pagination state
  const [pagination, setPagination] = React.useState<ServerPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [selectedItem, setSelectedItem] = React.useState<IBranchProduct | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<IBranchProduct[]>([]);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isEditPriceModalOpen, setIsEditPriceModalOpen] = React.useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = React.useState(false);
  const [salePriceValue, setSalePriceValue] = React.useState(0);
  const [minStockValue, setMinStockValue] = React.useState(0);
  const [noteValue, setNoteValue] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filter changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filterBranchId, filterLowStock]);

  const handleDeleteMany = (items: IBranchProduct[]) => {
    setSelectedItems(items);
    setSelectedItem(null);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      const promises = selectedItems.map(item => stockService.delete(item._id));
      await Promise.all(promises);
      toast.success(`Đã xóa ${selectedItems.length} sản phẩm khỏi kho`);
      setSelectedItems([]);
      setIsDeleteOpen(false);
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Có lỗi xảy ra khi xóa");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch stock data - chỉ fetch khi user đã được load
  const fetchData = React.useCallback(async () => {
    // Đợi user load xong trước khi fetch
    if (user === undefined) return;
    
    try {
      setLoading(true);

      // Xác định branchId để filter
      // Admin: dùng filter dropdown (undefined = xem tất cả)
      // Staff: luôn dùng branchId của mình
      const effectiveBranchId = isAdmin
          ? (filterBranchId !== "all" ? filterBranchId : undefined)
          : user?.branchId;

      const params = {
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
        lowStockOnly: filterLowStock === 'low'
      };

      // When admin selects "All branches", use aggregated API
      const stockPromise = isAdmin && filterBranchId === "all"
        ? stockService.getAggregatedByProduct(params)
        : effectiveBranchId 
          ? stockService.getByBranch(effectiveBranchId, params)
          : stockService.getAll(params);

      const [res, statsRes] = await Promise.all([
          stockPromise,
          stockService.getStats(effectiveBranchId)
      ]);

      if (res.data) {
        setData(res.data);
      }
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination!.total,
          totalPages: res.pagination!.totalPages,
        }));
      }
      if (statsRes.data) {
          setStats(statsRes.data);
      }

    } catch (error) {
      console.error(error);
      toast.error("Không thể tải dữ liệu tồn kho");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterBranchId, debouncedSearch, pagination.page, pagination.limit, filterLowStock, user]);

  // Fetch branches
  const fetchBranches = React.useCallback(async () => {
    try {
      const res = await branchService.getAll();
      if (res.data) setBranches(res.data);
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  }, []);

  React.useEffect(() => {
    if (isAdmin) {
      fetchBranches();
    }
  }, [isAdmin, fetchBranches]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (item: IBranchProduct) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
  };

  const handleEditPrice = (item: IBranchProduct) => {
    setSelectedItem(item);
    setSalePriceValue(item.salePrice || 0);
    setMinStockValue(item.minStock || 0);
    setIsEditPriceModalOpen(true);
  };

  const handleEditNote = (item: IBranchProduct) => {
    setSelectedItem(item);
    setNoteValue(item.note || "");
    setIsNoteModalOpen(true);
  };

  const handleSavePrice = async () => {
    if (!selectedItem) return;
    
    try {
      setIsSubmitting(true);
      const branchId = isAdmin ? (filterBranchId !== "all" ? filterBranchId : selectedItem.branchId?._id) : undefined;
      
      // Update both salePrice and minStock
      const promises: Promise<any>[] = [];
      
      if (salePriceValue !== selectedItem.salePrice) {
        promises.push(stockService.updateSalePrice(selectedItem._id, salePriceValue, branchId));
      }
      if (minStockValue !== selectedItem.minStock) {
        promises.push(stockService.updateMinStock(selectedItem._id, minStockValue, branchId));
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
        toast.success("Đã cập nhật thông tin");
      }
      
      setIsEditPriceModalOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Không thể cập nhật thông tin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedItem) return;
    
    try {
      setIsSubmitting(true);
      const branchId = isAdmin ? (filterBranchId !== "all" ? filterBranchId : selectedItem.branchId?._id) : undefined;
      
      await stockService.updateNote(selectedItem._id, noteValue, branchId);
      
      toast.success("Đã cập nhật ghi chú");
      setIsNoteModalOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error("Update note error:", error);
      toast.error("Không thể cập nhật ghi chú");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show branch count column when viewing aggregated data (all branches)
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
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">{product?.name || "N/A"}</p>
                <p className="text-xs text-muted-foreground">
                  {product?.barcode || "—"}
                </p>
              </div>
            </div>
          );
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
          
          // Logic tách bạch: Aggregated view vs Single branch view
          if (showBranchCountColumn) {
            // AGGREGATED VIEW (Tất cả chi nhánh): dùng giá trị cứng
            const isOutOfStock = stock <= 0;
            const isLow = !isOutOfStock && stock <= 5;
            return (
              <div className="flex items-center gap-2">
                <span className={isOutOfStock || isLow ? "text-destructive font-medium" : ""}>
                  {stock}
                </span>
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Hết hàng
                  </Badge>
                )}
                {isLow && (
                  <Badge variant="secondary" className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <AlertTriangle className="h-3 w-3" />
                    Sắp hết
                  </Badge>
                )}
              </div>
            );
          }
          
          // SINGLE BRANCH VIEW: dùng minStock của từng sản phẩm
          const minStock = row.original.minStock;
          const isOutOfStock = stock <= 0;
          const isLow = !isOutOfStock && stock <= minStock;
          return (
            <div className="flex items-center gap-2">
              <span className={isOutOfStock || isLow ? "text-destructive font-medium" : ""}>
                {stock}
              </span>
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Hết hàng
                </Badge>
              )}
              {isLow && (
                <Badge variant="secondary" className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  <AlertTriangle className="h-3 w-3" />
                  Sắp hết
                </Badge>
              )}
            </div>
          );
        },
      },
      // Chỉ hiển thị cột định mức tối thiểu khi không phải aggregated view
      ...(!showBranchCountColumn
        ? [
            {
              accessorKey: "minStock",
              header: "Định mức tối thiểu",
            } as ColumnDef<IBranchProduct>,
          ]
        : []),
      // Chỉ hiển thị cột giá bán khi không phải aggregated view
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
          ]
        : []),
      // Chỉ hiển thị cột ghi chú khi không phải aggregated view
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
            return format(new Date(row.getValue("updatedAt")), "dd/MM/yyyy HH:mm");
          } catch {
            return "—";
          }
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const isAnyRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;
          // Hide actions for aggregated view
          if (row.original.isAggregated) return null;
          return (
            <RowActions 
              onView={() => handleView(row.original)}
              onEdit={() => handleEditPrice(row.original)}
              editLabel="Chỉnh sửa"
              customActions={[
                {
                  label: "Cập nhật ghi chú",
                  icon: <FileEdit className="h-4 w-4" />,
                  onClick: () => handleEditNote(row.original),
                }
              ]}
              disabled={isAnyRowSelected}
            />
          );
        },
      },
    ],
    [showBranchCountColumn]
  );
  
  // Custom toolbar actions (Filters)
  const toolbarActions = (
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
        <Select
            value={filterLowStock}
            onValueChange={setFilterLowStock}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái tồn kho" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="low">Sắp hết hàng</SelectItem>
            </SelectContent>
        </Select>
      </>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Quản lý tồn kho</h1>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Tổng mặt hàng"
          value={stats.totalItems}
          icon={Package}
          description="Số lượng loại sản phẩm trong kho"
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

      {/* Table */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={data}
          filterCol="productId"
          filterPlaceholder="Tìm theo tên hoặc mã vạch..."
          // Server-side pagination
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
          onBulkAction={handleDeleteMany}
          bulkActionLabel="Xóa đã chọn"
          bulkActionIcon="trash"
          toolbarActions={toolbarActions}
        />
      )}

      <ConfirmDeleteDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title={`Xóa ${selectedItems.length} mục tồn kho?`}
        description="Hành động này sẽ xóa dữ liệu tồn kho của các sản phẩm đã chọn khỏi chi nhánh."
      />

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết tồn kho"
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Product Info Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              {(selectedItem.productId?.images?.[0] || selectedItem.productId?.image) ? (
                <img
                  src={selectedItem.productId?.images?.[0] || selectedItem.productId?.image}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{selectedItem.productId?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedItem.productId?.barcode || "Không có mã vạch"}
                </p>
              </div>
              {selectedItem.stock <= 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Hết hàng
                </Badge>
              ) : selectedItem.stock <= selectedItem.minStock ? (
                <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  <AlertTriangle className="h-3 w-3" />
                  Sắp hết
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Còn hàng
                </Badge>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chi nhánh</p>
                <p className="font-medium">{selectedItem.branchId?.branchName || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Giá bán</p>
                <p className="font-medium text-primary">{formatCurrency(selectedItem.salePrice || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tồn kho hiện tại</p>
                <p className="text-2xl font-bold">{selectedItem.stock}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Định mức tối thiểu</p>
                <p className="font-medium">{selectedItem.minStock}</p>
              </div>
            </div>

            {/* Note */}
            {selectedItem.note && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Ghi chú</p>
                <p>{selectedItem.note}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <Dialog open={isEditPriceModalOpen} onOpenChange={setIsEditPriceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Chỉnh sửa thông tin
            </DialogTitle>
            <DialogDescription>
              Cập nhật giá bán và định mức tối thiểu cho sản phẩm
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="grid gap-4 py-4">
              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {(selectedItem.productId?.images?.[0] || selectedItem.productId?.image) ? (
                  <img
                    src={selectedItem.productId?.images?.[0] || selectedItem.productId?.image}
                    alt=""
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-background rounded flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedItem.productId?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.productId?.barcode || "—"}
                  </p>
                </div>
              </div>

              {/* Readonly fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Chi nhánh</Label>
                  <Input
                    value={selectedItem.branchId?.branchName || "—"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Tồn kho hiện tại</Label>
                  <Input
                    value={selectedItem.stock}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="salePrice">Giá bán (VNĐ)</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    min={0}
                    placeholder="Nhập giá bán"
                    value={salePriceValue}
                    onChange={(e) => setSalePriceValue(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">Định mức tối thiểu</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min={0}
                    placeholder="Nhập định mức tối thiểu"
                    value={minStockValue}
                    onChange={(e) => setMinStockValue(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditPriceModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button onClick={handleSavePrice} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Modal */}
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Cập nhật ghi chú
            </DialogTitle>
            <DialogDescription>
              Thêm hoặc chỉnh sửa ghi chú cho sản phẩm trong kho
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {(selectedItem.productId?.images?.[0] || selectedItem.productId?.image) ? (
                  <img
                    src={selectedItem.productId?.images?.[0] || selectedItem.productId?.image}
                    alt=""
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-background rounded flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedItem.productId?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.productId?.barcode || "—"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">Ghi chú</Label>
                <Textarea
                  id="note"
                  placeholder="Nhập ghi chú về sản phẩm (vd: Sản phẩm bị hư hộp, cần kiểm tra...)"
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNoteModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button onClick={handleSaveNote} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu ghi chú"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
