"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CommonTable } from "@/components/common/common-table";
import { ImportReceipt, ImportReceiptStats } from "@/service/import-receipt.service";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RowActions } from "@/components/common/row-actions";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Barcode from "react-barcode";
import { DetailModal } from "@/components/common/detail-modal";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { ImportReceiptFormModal } from "@/components/forms/import-receipt-form-modal";
import { ImportReceiptExcelModal } from "@/components/forms/import-receipt-excel-modal";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, FileText, CheckCircle, Clock, DollarSign, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { useAuth } from "@/hooks/useAuth";
import importReceiptService, { CreateImportReceiptRequest } from "@/service/import-receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import { ImportReceiptDetailTable } from "@/components/import-receipt/import-receipt-detail-table";
import { StatsCard } from "@/components/common/stats-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter, DateRangeValue } from "@/components/common/date-range-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilteredTableData } from "@/hooks/useFilteredTableData";
import { useStats } from "@/hooks/useStats";
import { ErrorReceiptsTab } from "@/components/import-receipt/error-receipts-tab";

interface DateFilters {
  branchId?: string;
  status?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}

// Helper để lấy tên từ populated field
const getBranchName = (branchId: ImportReceipt["branchId"]): string => {
  if (!branchId) return "—";
  if (typeof branchId === "object" && branchId?.branchName) {
    return branchId.branchName;
  }
  return "—"; // Chi nhánh đã bị xóa hoặc không tồn tại
};

const getCreatedByName = (createdBy: ImportReceipt["createdBy"]): string => {
  if (typeof createdBy === "object") {
    return createdBy?.name || createdBy?.userName || "---";
  }
  return String(createdBy);
};

// Status badge helper
const getStatusBadge = (status: ImportReceipt["status"]) => {
  const config = {
    completed: { label: "Hoàn thành", variant: "default" as const },
    pending: { label: "Chờ xử lý", variant: "secondary" as const },
    cancelled: { label: "Đã hủy", variant: "destructive" as const },
  };
  const { label, variant } = config[status] || { label: status, variant: "outline" as const };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  // Use custom hooks - Backend will auto-inject branchId for staff via middleware
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
  } = useFilteredTableData<ImportReceipt, DateFilters>({
    fetchFn: importReceiptService.getAll,
    initialFilters: { branchId: undefined, status: undefined, period: undefined, startDate: undefined, endDate: undefined },
  });

  const { stats } = useStats<ImportReceiptStats>({
    fetchFn: () => importReceiptService.getStats(
      isAdmin ? filters.branchId : user?.branchId, 
      filters.period, 
      filters.startDate, 
      filters.endDate
    ),
    dependencies: [filters.branchId, filters.period, filters.startDate, filters.endDate, isAdmin, user?.branchId],
  });

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<ImportReceipt | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<ImportReceipt[]>([]);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = React.useState(false); // New State
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isBulkCancelOpen, setIsBulkCancelOpen] = React.useState(false);
  const [isMarkErrorOpen, setIsMarkErrorOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [errorNote, setErrorNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("normal");

  // Fetch branches for admin filter dropdown
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

  const handleDeleteMany = (items: ImportReceipt[]) => {
    const pendingItems = items.filter((i) => i.status === "pending");
    if (pendingItems.length === 0) {
      toast.error("Chỉ có thể hủy các phiếu đang ở trạng thái chờ xử lý");
      return;
    }
    if (pendingItems.length < items.length) {
      toast.warning("Một số phiếu không ở trạng thái chờ xử lý đã bị bỏ qua");
    }

    setSelectedItems(pendingItems);
    setSelectedItem(null);
    setCancelReason("");
    setIsBulkCancelOpen(true);
  };

  const confirmBulkCancel = async () => {
    try {
      setIsSubmitting(true);
      const promises = selectedItems.map((item) =>
        importReceiptService.cancel(item._id, cancelReason || "Hủy hàng loạt")
      );
      await Promise.all(promises);
      toast.success(`Đã hủy ${selectedItems.length} phiếu nhập`);
      setSelectedItems([]);
      setIsBulkCancelOpen(false);
      refetch();
    } catch (error) {
      console.error("Bulk cancel error:", error);
      toast.error("Có lỗi xảy ra khi hủy phiếu");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers
  const handleView = (item: ImportReceipt) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleCreate = () => {
    router.push("/trang-quan-ly/nhap-hang/tao-moi");
  };

  const handleConfirm = (item: ImportReceipt) => {
    setSelectedItem(item);
    setIsConfirmOpen(true);
  };

  const handleCancel = (item: ImportReceipt) => {
    setSelectedItem(item);
    setCancelReason("");
    setIsCancelOpen(true);
  };

  const handleMarkError = (item: ImportReceipt) => {
    setSelectedItem(item);
    setErrorNote("");
    setIsMarkErrorOpen(true);
  };

  // Create receipt
  const handleFormSubmit = async (formData: CreateImportReceiptRequest) => {
    try {
      setIsSubmitting(true);
      await importReceiptService.create(formData);
      toast.success("Tạo phiếu nhập thành công!");
      setIsFormOpen(false);
      refetch();
    } catch (error: unknown) {
      console.error("Create error:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm receipt (update stock)
  const confirmReceipt = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await importReceiptService.confirm(selectedItem._id);
      toast.success("Xác nhận phiếu nhập thành công! Đã cập nhật tồn kho.");
      setIsConfirmOpen(false);
      setSelectedItem(null);
      refetch();
    } catch (error: unknown) {
      console.error("Confirm error:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel receipt
  const cancelReceipt = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await importReceiptService.cancel(selectedItem._id, cancelReason);
      toast.success("Đã hủy phiếu nhập!");
      setIsCancelOpen(false);
      setSelectedItem(null);
      refetch();
    } catch (error: unknown) {
      console.error("Cancel error:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark as error
  const markAsError = async () => {
    if (!selectedItem) return;
    
    // Validate errorNote
    if (!errorNote || errorNote.trim() === "") {
      toast.error("Vui lòng nhập lý do đánh dấu lỗi");
      return;
    }
    
    try {
      setIsSubmitting(true);
      await importReceiptService.markAsError(selectedItem._id, errorNote);
      toast.success("Đã đánh dấu phiếu lỗi! Kho hàng đã được hoàn lại.");
      setIsMarkErrorOpen(false);
      setSelectedItem(null);
      setErrorNote("");
      refetch();
    } catch (error: unknown) {
      console.error("Mark error:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<ImportReceipt>[]>(
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
      },
      {
        accessorKey: "code",
        header: "Mã phiếu nhập",
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.getValue("code")}</span>
        ),
      },
      // Chỉ hiển thị cột chi nhánh khi admin chọn "Tất cả chi nhánh"
      ...(isAdmin && !filters.branchId ? [{
        accessorKey: "branchId" as const,
        header: "Chi nhánh",
        cell: ({ row }: { row: any }) => getBranchName(row.original.branchId),
      }] : []),
      {
        accessorKey: "supplierName",
        header: "Nhà cung cấp",
        cell: ({ row }) => row.getValue("supplierName") || "---",
      },
      {
        accessorKey: "createdBy",
        header: "Người tạo",
        cell: ({ row }) => getCreatedByName(row.original.createdBy),
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => {
          try {
            return format(new Date(row.getValue("createdAt")), "dd/MM/yyyy HH:mm");
          } catch {
            return row.getValue("createdAt");
          }
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
        cell: ({ row }) => getStatusBadge(row.getValue("status")),
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const item = row.original;
          const isPending = item.status === "pending";
          const isCompleted = item.status === "completed";
          const isAnyRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;

          // Check nếu phiếu được tạo trong vòng 30 phút
          const createdAt = new Date(item.createdAt);
          const now = new Date();
          const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          const canMarkError = isCompleted && diffInMinutes <= 30; // Cả staff và admin đều có thể đánh dấu lỗi

          return (
            <div className="flex items-center gap-2">
              <RowActions
                onView={() => handleView(item)}
                onAction={isPending ? () => handleConfirm(item) : undefined}
                actionLabel="Xác nhận"
                actionIcon="check"
                onDelete={isPending ? () => handleCancel(item) : undefined}
                disabled={isAnyRowSelected}
              />
              {canMarkError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkError(item)}
                  disabled={isAnyRowSelected}
                  className="h-8 text-destructive hover:text-destructive"
                  title="Đánh dấu lỗi (chỉ trong 30 phút)"
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [isAdmin, filters.branchId]
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
          onValueChange={(value) => updateFilter("branchId", value === "all" ? undefined : value)}
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
        onValueChange={(value) => updateFilter("status", value === "all" ? undefined : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="pending">Chờ xử lý</SelectItem>
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
    </>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Quản lý nhập hàng</h1>
        <div className="flex gap-2">
          {/* New Import Button */}
          <Button variant="outline" onClick={() => setIsImportExcelOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Nhập từ Excel
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo phiếu nhập
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="normal">
            <FileText className="mr-2 h-4 w-4" />
            Phiếu nhập
          </TabsTrigger>
          <TabsTrigger value="error">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Phiếu lỗi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="normal" className="flex-1 flex flex-col gap-4 mt-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatsCard
              title="Tổng phiếu nhập"
              value={stats?.totalReceipts || 0}
              icon={FileText}
              description="Tổng số phiếu nhập hàng"
            />
            <StatsCard
              title="Chờ xử lý"
              value={stats?.pendingCount || 0}
              icon={Clock}
              description="Phiếu nhập đang chờ duyệt"
              trend="neutral"
            />
            <StatsCard
              title="Hoàn thành"
              value={stats?.completedCount || 0}
              icon={CheckCircle}
              description="Phiếu nhập đã hoàn tất"
              trend="positive"
            />
            <StatsCard
              title="Tổng giá trị nhập"
              value={formatCurrency(stats?.totalValue || 0)}
              icon={DollarSign}
              description="Giá trị hàng đã nhập kho"
            />
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CommonTable
              columns={columns}
              data={data}
              filterCol="code"
              filterPlaceholder="Tìm mã phiếu nhập..."
              onBulkAction={handleDeleteMany}
              bulkActionLabel="Hủy đã chọn"
              bulkActionIcon="trash"
              toolbarActions={toolbarActions}
              serverPagination={pagination}
              onPageChange={handlePageChange}
              onSearch={handleSearch}
              searchValue={searchTerm}
            />
          )}
        </TabsContent>

        <TabsContent value="error" className="flex-1 flex flex-col mt-4">
          <ErrorReceiptsTab
            isAdmin={isAdmin}
            isManager={isManager}
            branches={branches}
            userBranchId={user?.branchId}
          />
        </TabsContent>
      </Tabs>

      {/* Import Excel Modal - Added here */}
      <ImportReceiptExcelModal
        open={isImportExcelOpen}
        onOpenChange={setIsImportExcelOpen}
        onSuccess={() => {
          setIsImportExcelOpen(false);
          refetch();
        }}
        branches={branches}
        userBranchId={user?.branchId}
        isAdmin={isAdmin}
      />

      {/* Create Form Modal */}
      <ImportReceiptFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        branches={branches}
        userBranchId={user?.branchId}
        isAdmin={isAdmin}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Confirm Dialog */}
      <ConfirmDeleteDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmReceipt}
        isSubmitting={isSubmitting}
        title="Xác nhận phiếu nhập?"
        description={`Xác nhận phiếu ${selectedItem?.code}? Hành động này sẽ cập nhật số lượng tồn kho cho các sản phẩm trong phiếu.`}
        variant="default"
        confirmLabel="Xác nhận"
      />

      {/* Cancel Dialog */}
      <ConfirmDeleteDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        onConfirm={cancelReceipt}
        isSubmitting={isSubmitting}
        title="Hủy phiếu nhập?"
        description={
          <div className="space-y-4">
            <p>Bạn có chắc chắn muốn hủy phiếu {selectedItem?.code}?</p>
            <div className="space-y-2">
              <Label>Lý do hủy</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy phiếu..."
                rows={2}
              />
            </div>
          </div>
        }
      />

      {/* Bulk Cancel Dialog */}
      <ConfirmDeleteDialog
        open={isBulkCancelOpen}
        onOpenChange={setIsBulkCancelOpen}
        onConfirm={confirmBulkCancel}
        isSubmitting={isSubmitting}
        title={`Hủy ${selectedItems.length} phiếu nhập?`}
        description={
          <div className="space-y-4">
            <p>Bạn có chắc chắn muốn hủy các phiếu đã chọn? Hành động này không thể hoàn tác.</p>
            <div className="space-y-2">
              <Label>Lý do hủy chung</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy..."
                rows={2}
              />
            </div>
          </div>
        }
      />

      {/* Mark Error Dialog */}
      <ConfirmDeleteDialog
        open={isMarkErrorOpen}
        onOpenChange={setIsMarkErrorOpen}
        onConfirm={markAsError}
        isSubmitting={isSubmitting}
        title="Đánh dấu phiếu lỗi?"
        description={
          <div className="space-y-4">
            <p className="text-destructive font-medium">
              Đánh dấu phiếu {selectedItem?.code} là phiếu lỗi?
            </p>
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Điều kiện đánh dấu lỗi</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Chỉ trong vòng 30 phút sau khi tạo phiếu</li>
                    <li>Tồn kho phải đủ để hoàn lại (không được âm)</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Hệ thống sẽ kiểm tra tồn kho trước khi hoàn lại. Nếu hàng đã được bán hết, bạn sẽ không thể đánh dấu lỗi.
            </p>
            <div className="space-y-2">
              <Label>Lý do đánh dấu lỗi <span className="text-destructive">*</span></Label>
              <Textarea
                value={errorNote}
                onChange={(e) => setErrorNote(e.target.value)}
                placeholder="Ví dụ: Nhập sai số lượng, nhập sai giá, nhà cung cấp giao sai hàng..."
                rows={3}
              />
            </div>
          </div>
        }
        variant="destructive"
        confirmLabel="Đánh dấu lỗi"
      />

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết phiếu nhập"
        maxWidth="3xl"
        footer={
          selectedItem ? (
            <div className="flex gap-2">
              {selectedItem.status === "pending" ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleCancel(selectedItem);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Hủy phiếu
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleConfirm(selectedItem);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Xác nhận
                  </Button>
                </>
              ) : selectedItem.status === "completed" ? (
                (() => {
                  const createdAt = new Date(selectedItem.createdAt);
                  const now = new Date();
                  const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
                  const canMarkError = diffInMinutes <= 30; // Cả staff và admin
                  
                  return canMarkError ? (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleMarkError(selectedItem);
                      }}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Đánh dấu lỗi
                    </Button>
                  ) : null;
                })()
              ) : null}
            </div>
          ) : undefined
        }
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <p className="text-sm text-muted-foreground">Mã phiếu</p>
                <p className="text-xl font-semibold">{selectedItem.code}</p>
              </div>
              <div>{getStatusBadge(selectedItem.status)}</div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chi nhánh</p>
                <p className="font-medium">{getBranchName(selectedItem.branchId)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nhà cung cấp</p>
                <p className="font-medium">{selectedItem.supplierName || "---"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Người tạo</p>
                <p className="font-medium">{getCreatedByName(selectedItem.createdBy)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ngày tạo</p>
                <p className="font-medium">{format(new Date(selectedItem.createdAt), "dd/MM/yyyy HH:mm")}</p>
              </div>
            </div>

            {selectedItem.note && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Ghi chú</p>
                <p>{selectedItem.note}</p>
              </div>
            )}

            {/* Products Table */}
            <div>
              <h4 className="mb-3 font-medium">
                Danh sách sản phẩm ({selectedItem.listProduct.length})
              </h4>
              {selectedItem.listProduct.length > 100 ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
                  <p className="text-yellow-800 font-medium">
                    Danh sách sản phẩm quá dài ({selectedItem.listProduct.length} sản phẩm).
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Vui lòng xem chi tiết trong file Excel gốc hoặc xuất dữ liệu để kiểm tra.
                  </p>
                </div>
              ) : (
                <ImportReceiptDetailTable 
                  products={selectedItem.listProduct} 
                  totalAmount={selectedItem.totalAmount}
                />
              )}
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
