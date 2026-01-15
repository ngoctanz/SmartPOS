"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CommonTable } from "@/components/common/common-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  Loader2,
  Printer,
  Eye,
  ExternalLink,
  MoreHorizontal,
  FileText,
  Clock,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import receiptService, {
  Receipt,
  ReceiptStats,
} from "@/service/receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MultiplePrintBill,
  printStyles,
  ErrorReceiptList,
  MarkErrorDialog,
  PaymentMethodStats,
} from "@/components/receipt";
import { formatCurrency } from "@/utils/format.utils";
import { StatsCard } from "@/components/common/stats-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangeFilter,
  DateRangeValue,
} from "@/components/common/date-range-filter";
import { useAuth } from "@/hooks/useAuth";
import { useFilteredTableData } from "@/hooks/useFilteredTableData";
import { useStats } from "@/hooks/useStats";
import { useSocket } from "@/hooks/useSocket";
import { printReceipt as printReceiptDirect } from "@/utils/print-direct";

interface DateFilters {
  branchId?: string;
  status?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

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
    refetch,
  } = useFilteredTableData<Receipt, DateFilters>({
    fetchFn: receiptService.getAll,
    initialFilters: {
      branchId: undefined,
      status: undefined,
      period: undefined,
      startDate: undefined,
      endDate: undefined,
    },
  });

  const { stats } = useStats<ReceiptStats>({
    fetchFn: () =>
      receiptService.getStats(
        isAdmin ? filters.branchId : user?.branchId,
        filters.period,
        filters.startDate,
        filters.endDate
      ),
    dependencies: [
      filters.branchId,
      filters.period,
      filters.startDate,
      filters.endDate,
      isAdmin,
      user?.branchId,
    ],
  });

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<Receipt | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [showMultiplePrintDialog, setShowMultiplePrintDialog] =
    React.useState(false);
  const [selectedReceipts, setSelectedReceipts] = React.useState<Receipt[]>([]);
  const multiplePrintRef = React.useRef<HTMLDivElement>(null);

  // Mark error state
  const [showMarkErrorDialog, setShowMarkErrorDialog] = React.useState(false);
  const [markErrorReceipt, setMarkErrorReceipt] =
    React.useState<Receipt | null>(null);
  const [isMarkingError, setIsMarkingError] = React.useState(false);

  // Error receipts state
  const [activeTab, setActiveTab] = React.useState("all");
  const [errorReceipts, setErrorReceipts] = React.useState<Receipt[]>([]);
  const [errorLoading, setErrorLoading] = React.useState(false);
  const [errorPagination, setErrorPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [errorSearch, setErrorSearch] = React.useState("");

  // Delete operations state
  const [selectedRows, setSelectedRows] = React.useState<Receipt[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false);
  const [showDeleteByMonthDialog, setShowDeleteByMonthDialog] =
    React.useState(false);
  const [deleteMonth, setDeleteMonth] = React.useState<number>(
    new Date().getMonth() + 1
  );
  const [deleteYear, setDeleteYear] = React.useState<number>(
    new Date().getFullYear()
  );
  const [deleteBranchId, setDeleteBranchId] = React.useState<string | undefined>(
    undefined
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Real-time payment notifications via WebSocket
  useSocket({
    onPaymentSuccess: (data) => {
      toast.success(
        `Đơn hàng ${
          data.receiptCode
        } đã thanh toán thành công: ${formatCurrency(data.amount)}`,
        {
          duration: 5000,
          position: "top-right",
        }
      );
      // Refresh data to show updated status
      refetch();
    },
    enabled: true,
  });

  // Fetch branches
  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await branchService.getAll();
        if (res.data) setBranches(res.data);
      } catch (error) {
        console.error("Failed to fetch branches:", error);
      }
    };
    fetchBranches();
  }, []);

  // Fetch error receipts
  const fetchErrorReceipts = React.useCallback(async () => {
    setErrorLoading(true);
    try {
      const response = await receiptService.getErrors({
        page: errorPagination.page,
        limit: errorPagination.limit,
        search: errorSearch,
        branchId: isAdmin ? filters.branchId : undefined,
      });

      if (response.success && response.data) {
        setErrorReceipts(response.data);
        if (response.pagination) {
          setErrorPagination(response.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch error receipts:", error);
      toast.error("Không thể tải danh sách hóa đơn lỗi");
    } finally {
      setErrorLoading(false);
    }
  }, [
    errorPagination.page,
    errorPagination.limit,
    errorSearch,
    filters.branchId,
    isAdmin,
  ]);

  // Fetch error count on mount
  React.useEffect(() => {
    const fetchErrorCount = async () => {
      try {
        const response = await receiptService.getErrors({
          page: 1,
          limit: 1,
          branchId: isAdmin ? filters.branchId : undefined,
        });
        if (response.success && response.pagination) {
          setErrorPagination((prev) => ({
            ...prev,
            total: response.pagination?.total || 0,
            totalPages: response.pagination?.totalPages || 0,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch error count:", error);
      }
    };
    fetchErrorCount();
  }, [isAdmin, filters.branchId]);

  // Fetch error receipts when tab changes
  React.useEffect(() => {
    if (activeTab === "errors") {
      fetchErrorReceipts();
    }
  }, [activeTab, fetchErrorReceipts]);

  const handleView = (item: Receipt) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handlePrint = (item: Receipt) => {
    // Print directly using browser print dialog
    printReceiptDirect(item);
  };

  const handleViewDetail = (item: Receipt) => {
    router.push(`/trang-quan-ly/hoa-don/${item.code}`);
  };

  // Mark error handlers
  const handleOpenMarkError = (item: Receipt) => {
    setMarkErrorReceipt(item);
    setShowMarkErrorDialog(true);
  };

  const handleMarkError = async (errorReason?: string) => {
    if (!markErrorReceipt) return;

    setIsMarkingError(true);
    try {
      const response = await receiptService.markAsError(
        markErrorReceipt._id,
        errorReason
      );

      if (response.success) {
        setShowMarkErrorDialog(false);
        setMarkErrorReceipt(null);
        toast.success("Đã đánh dấu hóa đơn lỗi và hoàn hàng về kho!");

        // Refresh both normal receipts and error receipts
        refetch();
        fetchErrorReceipts();
      } else {
        toast.error(response.message || "Không thể đánh dấu hóa đơn lỗi");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi đánh dấu hóa đơn lỗi");
    } finally {
      setIsMarkingError(false);
    }
  };

  const handleBulkPrint = (selectedRows: Receipt[]) => {
    if (selectedRows.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 hóa đơn");
      return;
    }
    setSelectedReceipts(selectedRows);
    setShowMultiplePrintDialog(true);
  };

  const executeMultiplePrint = () => {
    // Add print styles
    const styleSheet = document.createElement("style");
    styleSheet.innerHTML = printStyles;
    document.head.appendChild(styleSheet);

    window.print();

    // Cleanup
    setTimeout(() => {
      document.head.removeChild(styleSheet);
      setShowMultiplePrintDialog(false);
    }, 1000);
  };

  // Delete handlers
  const handleDeleteReceipt = async (receipt: Receipt) => {
    setSelectedItem(receipt);
    setShowDeleteDialog(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!selectedItem) return;

    setIsDeleting(true);
    try {
      const response = await receiptService.deleteReceipt(selectedItem._id);
      if (response.success) {
        toast.success("Đã xóa hóa đơn thành công!");
        setShowDeleteDialog(false);
        setSelectedItem(null);
        refetch();
      } else {
        toast.error(response.message || "Không thể xóa hóa đơn");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi khi xóa hóa đơn");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 hóa đơn");
      return;
    }
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    setIsDeleting(true);
    try {
      const ids = selectedRows.map((r) => r._id);
      const response = await receiptService.deleteManyReceipts(ids);
      if (response.success) {
        toast.success(
          `Đã xóa ${response.data?.deletedCount || selectedRows.length} hóa đơn!`
        );
        setShowBulkDeleteDialog(false);
        setSelectedRows([]);
        refetch();
      } else {
        toast.error(response.message || "Không thể xóa hóa đơn");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi khi xóa hóa đơn");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteByMonth = () => {
    setShowDeleteByMonthDialog(true);
  };

  const confirmDeleteByMonth = async () => {
    setIsDeleting(true);
    try {
      const response = await receiptService.deleteReceiptsByMonth(
        deleteMonth,
        deleteYear,
        isAdmin ? deleteBranchId : undefined
      );
      if (response.success) {
        toast.success(
          `Đã xóa ${response.data?.deletedCount || 0} hóa đơn của tháng ${deleteMonth}/${deleteYear}!`
        );
        setShowDeleteByMonthDialog(false);
        // Reset delete branch selection
        setDeleteBranchId(undefined);
        refetch();
      } else {
        toast.error(response.message || "Không thể xóa hóa đơn");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi khi xóa hóa đơn");
    } finally {
      setIsDeleting(false);
    }
  };

  const getBranchName = (
    branchId: string | { _id: string; branchName: string } | null | undefined
  ) => {
    if (!branchId) return "—";
    if (typeof branchId === "object" && branchId?.branchName)
      return branchId.branchName;
    const branch = branches.find((b) => b._id === branchId);
    return branch ? branch.branchName : "—";
  };

  const getCashierName = (
    cashier: string | { _id: string; userName: string; name?: string }
  ) => {
    if (typeof cashier === "object") return cashier.name || cashier.userName;
    return cashier;
  };

  const columns = React.useMemo<ColumnDef<Receipt>[]>(
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
      },
      {
        accessorKey: "code",
        header: "Mã hóa đơn",
        cell: ({ row }) => {
          const code = row.getValue("code") as string;
          return (
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary"
              onClick={() => handleViewDetail(row.original)}
            >
              {code}
            </Button>
          );
        },
      },
      // Chỉ hiển thị cột chi nhánh khi admin chọn "Tất cả chi nhánh"
      ...(isAdmin && !filters.branchId
        ? [
            {
              accessorKey: "branchId" as const,
              header: "Chi nhánh",
              cell: ({ row }: { row: any }) => {
                const branchId = row.getValue("branchId") as
                  | string
                  | { _id: string; branchName: string };
                return getBranchName(branchId);
              },
            },
          ]
        : []),
      {
        accessorKey: "createdBy",
        header: "Người lập",
        cell: ({ row }) => {
          const cashier = row.getValue("createdBy") as
            | string
            | { _id: string; userName: string; name?: string };
          return getCashierName(cashier);
        },
      },
      {
        accessorKey: "createdAt",
        header: "Ngày lập",
        cell: ({ row }) => {
          try {
            return format(
              new Date(row.getValue("createdAt")),
              "dd/MM/yyyy HH:mm"
            );
          } catch {
            return row.getValue("createdAt");
          }
        },
      },
      {
        accessorKey: "paymentMethod",
        header: "Thanh toán",
        cell: ({ row }) => {
          const method = row.getValue("paymentMethod") as string;
          return method === "cash"
            ? "Tiền mặt"
            : method === "card"
            ? "Thẻ"
            : "Chuyển khoản";
        },
      },
      {
        accessorKey: "totalAmount",
        header: "Tổng tiền",
        cell: ({ row }) => formatCurrency(row.getValue("totalAmount")),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge
              variant={
                status === "completed"
                  ? "default"
                  : status === "pending"
                  ? "secondary"
                  : "destructive"
              }
            >
              {status === "completed"
                ? "Hoàn thành"
                : status === "pending"
                ? "Chờ thanh toán"
                : "Đã hủy"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const isAnyRowSelected =
            table.getFilteredSelectedRowModel().rows.length > 0;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isAnyRowSelected}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(row.original)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Xem nhanh
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleViewDetail(row.original)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePrint(row.original)}>
                  <Printer className="h-4 w-4 mr-2" />
                  In hóa đơn
                </DropdownMenuItem>
                {/* Chỉ hiện nút đánh dấu lỗi khi hóa đơn chưa bị hủy và chưa lỗi */}
                {row.original.status !== "cancelled" &&
                  !row.original.isError && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleOpenMarkError(row.original)}
                        className="text-destructive focus:text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Đánh dấu lỗi
                      </DropdownMenuItem>
                    </>
                  )}
                {/* Chỉ admin và manager mới có quyền xóa */}
                {(isAdmin || isManager) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteReceipt(row.original)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa hóa đơn
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [branches, isAdmin, filters.branchId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Handle date range filter change
  const handleDateRangeChange = (value: DateRangeValue) => {
    updateFilter("period", value.period);
    updateFilter("startDate", value.startDate);
    updateFilter("endDate", value.endDate);
  };

  const toolbarActions = (
    <>
      {isAdmin && (
        <Select
          value={filters.branchId || "all"}
          onValueChange={(value) =>
            updateFilter("branchId", value === "all" ? undefined : value)
          }
        >
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
        value={filters.status || "all"}
        onValueChange={(value) =>
          updateFilter("status", value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="pending">Chờ thanh toán</SelectItem>
          <SelectItem value="completed">Hoàn thành</SelectItem>
          <SelectItem value="cancelled">Đã hủy</SelectItem>
        </SelectContent>
      </Select>
      <DateRangeFilter
        value={{
          period: filters.period,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }}
        onChange={handleDateRangeChange}
        className="w-[160px]"
      />
      {(isAdmin || isManager) && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteByMonth}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Xóa theo tháng
        </Button>
      )}
    </>
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Quản lý hóa đơn
        </h1>
        <Button onClick={() => router.push("/trang-quan-ly/hoa-don/tao-moi")}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo hóa đơn
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Tổng hóa đơn"
          value={stats?.totalReceipts || 0}
          icon={FileText}
          description="Tổng số hóa đơn bán hàng"
        />
        <StatsCard
          title="Chờ xử lý"
          value={stats?.pendingCount || 0}
          icon={Clock}
          description="Hóa đơn chờ thanh toán"
          trend="neutral"
        />
        <StatsCard
          title="Hoàn thành"
          value={stats?.completedCount || 0}
          icon={CheckCircle}
          description="Hóa đơn đã hoàn tất"
          trend="positive"
        />
        <StatsCard
          title="Tổng doanh thu"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          description="Doanh thu từ các đơn thành công"
        />
      </div>

      {/* Payment Method Statistics */}
      <PaymentMethodStats
        cashCount={stats?.cashCount || 0}
        cashAmount={stats?.cashAmount || 0}
        transferCount={stats?.transferCount || 0}
        transferAmount={stats?.transferAmount || 0}
        cardCount={stats?.cardCount}
        cardAmount={stats?.cardAmount}
      />

      {/* Tabs for Normal and Error Receipts */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            Tất cả hóa đơn
            <Badge variant="secondary">{pagination.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Hóa đơn lỗi
            <Badge variant="destructive">{errorPagination.total}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1">
          <CommonTable
            columns={columns}
            data={data}
            filterCol="code"
            filterPlaceholder="Tìm mã hóa đơn..."
            toolbarActions={toolbarActions}
            serverPagination={pagination}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
            searchValue={searchTerm}
            onBulkAction={handleBulkPrint}
            bulkActionLabel="In hóa đơn"
            bulkActionIcon="printer"
            onSelectionChange={setSelectedRows}
            additionalBulkActions={
              isAdmin || isManager
                ? [
                    {
                      label: "Xóa hóa đơn đã chọn",
                      icon: "trash",
                      variant: "destructive" as const,
                      onClick: handleBulkDelete,
                    },
                  ]
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="errors" className="flex-1">
          <ErrorReceiptList
            data={errorReceipts}
            isLoading={errorLoading}
            pagination={errorPagination}
            onPageChange={(page) =>
              setErrorPagination((prev) => ({ ...prev, page }))
            }
            onSearch={setErrorSearch}
            searchValue={errorSearch}
            isAdmin={isAdmin}
            isManager={isManager}
            onRefresh={fetchErrorReceipts}
          />
        </TabsContent>
      </Tabs>

      {/* Quick View Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hóa đơn</DialogTitle>
            <DialogDescription>Xem nhanh thông tin hóa đơn</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-4 py-4">
              {/* Thông tin cơ bản - 2 cột */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Mã hóa đơn
                  </Label>
                  <p className="font-mono font-medium">{selectedItem.code}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Trạng thái
                  </Label>
                  <div>
                    <Badge
                      variant={
                        selectedItem.status === "completed"
                          ? "default"
                          : selectedItem.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {selectedItem.status === "completed"
                        ? "Hoàn thành"
                        : selectedItem.status === "pending"
                        ? "Chờ thanh toán"
                        : "Đã hủy"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Ngày lập
                  </Label>
                  <p className="text-sm">
                    {format(
                      new Date(selectedItem.createdAt),
                      "dd/MM/yyyy HH:mm"
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Tổng tiền
                  </Label>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(selectedItem.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Tiền khách đưa và tiền thối - chỉ hiện khi thanh toán tiền mặt */}
              {selectedItem.paymentMethod === "cash" &&
                selectedItem.customerPaid != null &&
                selectedItem.customerPaid > 0 && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Tiền khách đưa
                      </Label>
                      <p className="text-sm font-medium">
                        {formatCurrency(selectedItem.customerPaid)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Tiền thối
                      </Label>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(
                          selectedItem.customerPaid - selectedItem.totalAmount
                        )}
                      </p>
                    </div>
                  </div>
                )}

              {/* Payment QR Code for transfer payments */}
              {selectedItem.paymentMethod === "transfer" && (
                <div className="flex justify-center items-center gap-4 p-2 border rounded-lg bg-muted/30">
                  {/* QR Code - bên trái */}
                  <div className="flex-shrink-0">
                    {selectedItem.paymentInfo?.qrCode ? (
                      <div className="bg-white rounded border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedItem.paymentInfo.qrCode}
                          alt="Payment QR"
                          className="w-44 h-44 object-contain"
                          onError={(e) => {
                            const info = selectedItem.paymentInfo;
                            if (
                              info?.bin &&
                              info?.accountNumber &&
                              info?.amount
                            ) {
                              (
                                e.target as HTMLImageElement
                              ).src = `https://img.vietqr.io/image/${
                                info.bin
                              }-${info.accountNumber}-compact2.png?amount=${
                                info.amount
                              }&addInfo=${encodeURIComponent(
                                info.description || ""
                              )}&accountName=${encodeURIComponent(
                                info.accountName || ""
                              )}`;
                            }
                          }}
                        />
                      </div>
                    ) : selectedItem.paymentInfo?.bin &&
                      selectedItem.paymentInfo?.accountNumber ? (
                      <div className="bg-white rounded border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://img.vietqr.io/image/${
                            selectedItem.paymentInfo.bin
                          }-${
                            selectedItem.paymentInfo.accountNumber
                          }-compact2.png?amount=${
                            selectedItem.paymentInfo.amount ||
                            selectedItem.totalAmount
                          }&addInfo=${encodeURIComponent(
                            selectedItem.paymentInfo.description ||
                              selectedItem.code
                          )}&accountName=${encodeURIComponent(
                            selectedItem.paymentInfo.accountName || ""
                          )}`}
                          alt="Payment QR"
                          className="w-44 h-44 object-contain"
                        />
                      </div>
                    ) : selectedItem.paymentInfo?.checkoutUrl ? (
                      <div className="p-1 bg-white rounded border">
                        <QRCodeSVG
                          value={selectedItem.paymentInfo.checkoutUrl}
                          size={168}
                          level="H"
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 bg-muted flex items-center justify-center rounded">
                        <span className="text-xs text-muted-foreground">
                          Không có QR
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info - bên phải */}
                  <div className="space-y-2 text-sm">
                    {selectedItem.paymentInfo?.accountName && (
                      <p className="font-medium">
                        {selectedItem.paymentInfo.accountName}
                      </p>
                    )}
                    {selectedItem.paymentInfo?.accountNumber && (
                      <p className="font-mono text-muted-foreground">
                        {selectedItem.paymentInfo.accountNumber}
                      </p>
                    )}
                    <Badge
                      variant={
                        selectedItem.paymentInfo?.status === "paid"
                          ? "default"
                          : selectedItem.paymentInfo?.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {selectedItem.paymentInfo?.status === "paid"
                        ? "Đã thanh toán"
                        : selectedItem.paymentInfo?.status === "pending"
                        ? "Chờ thanh toán"
                        : selectedItem.paymentInfo?.status === "cancelled"
                        ? "Đã hủy"
                        : selectedItem.paymentInfo?.status === "expired"
                        ? "Hết hạn"
                        : "Chưa xác định"}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Danh sách sản phẩm */}
              <div className="mt-2">
                <h4 className="mb-2 font-medium text-sm">
                  Danh sách sản phẩm ({selectedItem.listProduct.length})
                </h4>
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-medium">Sản phẩm</th>
                        <th className="p-2 text-center font-medium">SL</th>
                        <th className="p-2 text-right font-medium">Đơn giá</th>
                        <th className="p-2 text-right font-medium">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.listProduct.map((p, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-2">{p.productName}</td>
                          <td className="p-2 text-center">{p.quantity}</td>
                          <td className="p-2 text-right">
                            {formatCurrency(p.salePrice)}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(p.salePrice * p.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedItem) handlePrint(selectedItem);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              In hóa đơn
            </Button>
            <Button
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedItem) handleViewDetail(selectedItem);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Xem chi tiết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multiple Print Preview Dialog */}
      <Dialog
        open={showMultiplePrintDialog}
        onOpenChange={setShowMultiplePrintDialog}
      >
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem trước hóa đơn</DialogTitle>
            <DialogDescription>
              Xem trước {selectedReceipts.length} hóa đơn trước khi in
            </DialogDescription>
          </DialogHeader>
          {selectedReceipts.length > 0 && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Số lượng hóa đơn: {selectedReceipts.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Các hóa đơn sẽ được in trên giấy khổ 80mm
                </p>
              </div>
              <div className="flex justify-center py-4 bg-gray-100 rounded-lg max-h-[400px] overflow-y-auto">
                <MultiplePrintBill
                  ref={multiplePrintRef}
                  receipts={selectedReceipts}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMultiplePrintDialog(false)}
            >
              Hủy
            </Button>
            <Button onClick={executeMultiplePrint}>
              <Printer className="h-4 w-4 mr-2" />
              In {selectedReceipts.length} hóa đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Multiple Print Component */}
      {selectedReceipts.length > 0 && (
        <div className="hidden">
          <MultiplePrintBill
            ref={multiplePrintRef}
            receipts={selectedReceipts}
          />
        </div>
      )}

      {/* Mark Error Dialog */}
      <MarkErrorDialog
        open={showMarkErrorDialog}
        onOpenChange={setShowMarkErrorDialog}
        receipt={markErrorReceipt}
        onConfirm={handleMarkError}
        isSubmitting={isMarkingError}
      />

      {/* Delete Single Receipt Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hóa đơn</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa hóa đơn{" "}
              <span className="font-semibold">{selectedItem?.code}</span>?
              <br />
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteReceipt}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xóa hóa đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa nhiều hóa đơn</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa{" "}
              <span className="font-semibold">{selectedRows.length}</span> hóa
              đơn đã chọn?
              <br />
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xóa {selectedRows.length} hóa đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete by Month Dialog */}
      <Dialog
        open={showDeleteByMonthDialog}
        onOpenChange={setShowDeleteByMonthDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa hóa đơn theo tháng</DialogTitle>
            <DialogDescription>
              Chọn tháng và năm để xóa tất cả hóa đơn trong tháng đó.
              <br />
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delete-month">Tháng</Label>
                <Select
                  value={deleteMonth.toString()}
                  onValueChange={(value) => setDeleteMonth(parseInt(value))}
                >
                  <SelectTrigger id="delete-month">
                    <SelectValue placeholder="Chọn tháng" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        Tháng {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-year">Năm</Label>
                <Select
                  value={deleteYear.toString()}
                  onValueChange={(value) => setDeleteYear(parseInt(value))}
                >
                  <SelectTrigger id="delete-year">
                    <SelectValue placeholder="Chọn năm" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - i
                    ).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="delete-branch">Chi nhánh (tùy chọn)</Label>
                <Select
                  value={deleteBranchId || "all"}
                  onValueChange={(value) =>
                    setDeleteBranchId(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger id="delete-branch">
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
              </div>
            )}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                Cảnh báo: Tất cả hóa đơn của tháng {deleteMonth}/{deleteYear}{" "}
                {isAdmin && !deleteBranchId
                  ? "ở tất cả chi nhánh"
                  : isAdmin && deleteBranchId
                  ? `tại ${
                      branches.find((b) => b._id === deleteBranchId)
                        ?.branchName || "chi nhánh đã chọn"
                    }`
                  : "tại chi nhánh của bạn"}{" "}
                sẽ bị xóa vĩnh viễn.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteByMonthDialog(false)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteByMonth}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xóa hóa đơn tháng {deleteMonth}/{deleteYear}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
