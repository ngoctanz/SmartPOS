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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Barcode from "react-barcode";
import { DetailModal } from "@/components/common/detail-modal";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { ImportReceiptFormModal } from "@/components/forms/import-receipt-form-modal";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, FileText, CheckCircle, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { useAuth } from "@/hooks/useAuth";
import importReceiptService, { CreateImportReceiptRequest } from "@/service/import-receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import { StatsCard } from "@/components/common/stats-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilteredTableData } from "@/hooks/useFilteredTableData";
import { useStats } from "@/hooks/useStats";

// Helper để lấy tên từ populated field
const getBranchName = (branchId: ImportReceipt["branchId"]): string => {
  if (typeof branchId === "object" && branchId?.branchName) {
    return branchId.branchName;
  }
  return String(branchId);
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
  } = useFilteredTableData<ImportReceipt, { branchId?: string; status?: string }>({
    fetchFn: importReceiptService.getAll,
    initialFilters: { branchId: undefined, status: undefined },
  });

  const { stats } = useStats<ImportReceiptStats>({
    fetchFn: () => importReceiptService.getStats(isAdmin ? filters.branchId : user?.branchId),
    dependencies: [filters.branchId, isAdmin, user?.branchId],
  });

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<ImportReceipt | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<ImportReceipt[]>([]);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isBulkCancelOpen, setIsBulkCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
          const isAnyRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;

          return (
            <RowActions
              onView={() => handleView(item)}
              onAction={isPending ? () => handleConfirm(item) : undefined}
              actionLabel="Xác nhận"
              actionIcon="check"
              onDelete={isPending ? () => handleCancel(item) : undefined}
              disabled={isAnyRowSelected}
            />
          );
        },
      },
    ],
    [isAdmin, filters.branchId]
  );

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
    </>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quản lý nhập hàng</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo phiếu nhập
        </Button>
      </div>

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

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết phiếu nhập"
        className="max-w-4xl"
        footer={
          selectedItem?.status === "pending" ? (
            <div className="flex gap-2">
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
            </div>
          ) : undefined
        }
      >
        {selectedItem && (
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Mã phiếu</Label>
                <Input value={selectedItem.code} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Trạng thái</Label>
                <div className="pt-2">{getStatusBadge(selectedItem.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Chi nhánh</Label>
                <Input value={getBranchName(selectedItem.branchId)} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nhà cung cấp</Label>
                <Input value={selectedItem.supplierName || "---"} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Người tạo</Label>
                <Input value={getCreatedByName(selectedItem.createdBy)} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Ngày tạo</Label>
                <Input
                  value={format(new Date(selectedItem.createdAt), "dd/MM/yyyy HH:mm")}
                  readOnly
                />
              </div>
            </div>

            {selectedItem.note && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Ghi chú</Label>
                <Textarea value={selectedItem.note} readOnly rows={2} />
              </div>
            )}

            {/* Products Table */}
            <div className="mt-4">
              <h4 className="mb-2 font-medium">
                Danh sách sản phẩm ({selectedItem.listProduct.length})
              </h4>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium min-w-[140px]">Mã vạch</th>
                      <th className="p-3 text-left font-medium">Tên sản phẩm</th>
                      <th className="p-3 text-right font-medium">SL</th>
                      <th className="p-3 text-right font-medium">Đơn giá</th>
                      <th className="p-3 text-right font-medium">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem.listProduct.map((p, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 py-4">
                          {p.barcode ? (
                            <div className="flex">
                              <Barcode
                                value={p.barcode}
                                width={1.2}
                                height={40}
                                fontSize={11}
                                displayValue={true}
                                margin={0}
                              />
                            </div>
                          ) : (
                            "---"
                          )}
                        </td>
                        <td className="p-3 py-4 align-middle">{p.productName}</td>
                        <td className="p-3 py-4 text-right align-middle">{p.quantity}</td>
                        <td className="p-3 py-4 text-right align-middle">
                          {formatCurrency(p.importPrice)}
                        </td>
                        <td className="p-3 py-4 text-right font-medium align-middle">
                          {formatCurrency(p.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-medium">
                    <tr>
                      <td colSpan={4} className="p-3 text-right">
                        Tổng cộng:
                      </td>
                      <td className="p-3 text-right text-lg">
                        {formatCurrency(selectedItem.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
