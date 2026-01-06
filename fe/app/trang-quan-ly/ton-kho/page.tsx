"use client";

import * as React from "react";
import { CommonTable, ServerPagination } from "@/components/common/common-table";
import { BranchProduct as IBranchProduct } from "@/service/stock.service";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/common/row-actions";
import { DetailModal } from "@/components/common/detail-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Loader2, Package, AlertTriangle } from "lucide-react";

export default function Page() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [data, setData] = React.useState<IBranchProduct[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filter state
  const [filterBranchId, setFilterBranchId] = React.useState<string>("all");
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
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

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
  }, [filterBranchId]);

  // Fetch stock data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
      };

      let res;
      if (isAdmin && filterBranchId && filterBranchId !== "all") {
        res = await stockService.getByBranch(filterBranchId, params);
      } else {
        res = await stockService.getAll(params);
      }

      if (res.data) {
        setData(res.data);
      }
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải dữ liệu tồn kho");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterBranchId, debouncedSearch, pagination.page, pagination.limit]);

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

  // Show branch column only when admin views all branches
  const showBranchColumn = isAdmin && filterBranchId === "all";

  const columns = React.useMemo<ColumnDef<IBranchProduct>[]>(
    () => [
      {
        accessorKey: "productId",
        header: "Sản phẩm",
        cell: ({ row }) => {
          const product = row.original.productId;
          return (
            <div className="flex items-center gap-3">
              {product?.image ? (
                <img
                  src={product.image}
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
      ...(showBranchColumn
        ? [
            {
              accessorKey: "branchId",
              header: "Chi nhánh",
              cell: ({ row }: { row: { original: IBranchProduct } }) => {
                const branch = row.original.branchId;
                return branch?.branchName || "N/A";
              },
            } as ColumnDef<IBranchProduct>,
          ]
        : []),
      {
        accessorKey: "stock",
        header: "Tồn kho",
        cell: ({ row }) => {
          const stock = row.getValue("stock") as number;
          const minStock = row.original.minStock;
          const isLow = stock <= minStock;
          return (
            <div className="flex items-center gap-2">
              <span className={isLow ? "text-destructive font-medium" : ""}>
                {stock}
              </span>
              {isLow && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Sắp hết
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "minStock",
        header: "Định mức tối thiểu",
      },
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
        cell: ({ row }) => (
          <RowActions onView={() => handleView(row.original)} />
        ),
      },
    ],
    [showBranchColumn]
  );

  // Stats
  const lowStockCount = data.filter((item) => item.stock <= item.minStock).length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý tồn kho</h1>
          <p className="text-sm text-muted-foreground">
            {pagination.total} sản phẩm
            {lowStockCount > 0 && (
              <span className="text-destructive ml-2">
                • {lowStockCount} sắp hết hàng
              </span>
            )}
          </p>
        </div>
        {/* Branch Filter - Admin only */}
        {isAdmin && (
          <Select value={filterBranchId} onValueChange={setFilterBranchId}>
            <SelectTrigger className="w-[200px]">
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
        />
      )}

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết tồn kho"
      >
        {selectedItem && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">Sản phẩm</Label>
              <div className="col-span-3 flex items-center gap-3">
                {selectedItem.productId?.image ? (
                  <img
                    src={selectedItem.productId.image}
                    alt=""
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
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
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">Chi nhánh</Label>
              <Input
                className="col-span-3"
                value={selectedItem.branchId?.branchName || "—"}
                readOnly
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">Tồn kho</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input value={selectedItem.stock} readOnly className="w-24" />
                {selectedItem.stock <= selectedItem.minStock && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Sắp hết
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Định mức tối thiểu
              </Label>
              <Input
                className="col-span-3 w-24"
                value={selectedItem.minStock}
                readOnly
              />
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
