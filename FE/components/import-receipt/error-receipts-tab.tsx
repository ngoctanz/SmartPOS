"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CommonTable } from "@/components/common/common-table";
import { ImportReceipt, ErrorReceiptStats } from "@/service/import-receipt.service";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { RowActions } from "@/components/common/row-actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DetailModal } from "@/components/common/detail-modal";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { toast } from "sonner";
import { Loader2, Trash2, RefreshCw, AlertTriangle, DollarSign, FileText } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import importReceiptService from "@/service/import-receipt.service";
import { Branch } from "@/service/branch.service";
import { StatsCard } from "@/components/common/stats-card";
import { ImportReceiptDetailTable } from "@/components/import-receipt/import-receipt-detail-table";
import { ImportReceiptDetailMobile } from "@/components/import-receipt/import-receipt-detail-mobile";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilteredTableData } from "@/hooks/useFilteredTableData";
import { useStats } from "@/hooks/useStats";

interface ErrorReceiptsTabProps {
  isAdmin: boolean;
  isManager?: boolean;
  branches: Branch[];
  userBranchId?: string;
}

// Helper functions
const getBranchName = (branchId: ImportReceipt["branchId"]): string => {
  if (!branchId) return "—";
  if (typeof branchId === "object" && branchId?.branchName) {
    return branchId.branchName;
  }
  return "—";
};

const getCreatedByName = (createdBy: ImportReceipt["createdBy"]): string => {
  if (typeof createdBy === "object") {
    return createdBy?.name || createdBy?.userName || "---";
  }
  return String(createdBy);
};

const getErrorMarkedByName = (errorMarkedBy: ImportReceipt["errorMarkedBy"]): string => {
  if (!errorMarkedBy) return "---";
  if (typeof errorMarkedBy === "object") {
    return errorMarkedBy?.name || errorMarkedBy?.userName || "---";
  }
  return String(errorMarkedBy);
};

export function ErrorReceiptsTab({ isAdmin, isManager = false, branches, userBranchId }: ErrorReceiptsTabProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // Admin hoặc Manager đều có quyền xóa
  const canDelete = isAdmin || isManager;

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
  } = useFilteredTableData<ImportReceipt, { branchId?: string }>({
    fetchFn: importReceiptService.getErrorReceipts,
    initialFilters: { branchId: undefined },
  });

  const { stats } = useStats<ErrorReceiptStats>({
    fetchFn: () => importReceiptService.getErrorStats(isAdmin ? filters.branchId : userBranchId),
    dependencies: [filters.branchId, isAdmin, userBranchId],
  });

  const [selectedItem, setSelectedItem] = React.useState<ImportReceipt | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<ImportReceipt[]>([]);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [isRecreateOpen, setIsRecreateOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleView = (item: ImportReceipt) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleDelete = (item: ImportReceipt) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleRecreate = (item: ImportReceipt) => {
    // Chuyển đến trang tạo phiếu nhập với data từ phiếu lỗi
    const productsData = item.listProduct.map(p => ({
      productId: p.productId,
      quantity: p.quantity,
      importPrice: p.importPrice,
    }));
    
    const queryParams = new URLSearchParams({
      fromError: item._id,
      branchId: typeof item.branchId === "object" ? item.branchId._id : item.branchId,
      supplierName: item.supplierName || "",
      note: item.note || "",
      products: encodeURIComponent(JSON.stringify(productsData)),
    });
    router.push(`/trang-quan-ly/nhap-hang/tao-moi?${queryParams.toString()}`);
  };

  const handleDeleteMany = (items: ImportReceipt[]) => {
    setSelectedItems(items);
    setSelectedItem(null);
    setIsBulkDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await importReceiptService.deleteErrorReceipt(selectedItem._id);
      toast.success("Đã xóa phiếu lỗi!");
      setIsDeleteOpen(false);
      setSelectedItem(null);
      refetch();
    } catch (error: unknown) {
      console.error("Delete error:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      setIsSubmitting(true);
      const promises = selectedItems.map((item) =>
        importReceiptService.deleteErrorReceipt(item._id)
      );
      await Promise.all(promises);
      toast.success(`Đã xóa ${selectedItems.length} phiếu lỗi`);
      setSelectedItems([]);
      setIsBulkDeleteOpen(false);
      refetch();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Có lỗi xảy ra khi xóa phiếu hoặc bạn ko có quyền thực hiện");
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
        header: "Mã phiếu",
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.getValue("code")}</span>
        ),
      },
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
        accessorKey: "totalAmount",
        header: "Tổng tiền",
        cell: ({ row }) => formatCurrency(row.getValue("totalAmount")),
      },
      {
        accessorKey: "errorNote",
        header: "Lý do lỗi",
        cell: ({ row }) => {
          const note = row.getValue("errorNote") as string;
          return note ? (
            <span className="text-sm text-muted-foreground line-clamp-1">{note}</span>
          ) : "---";
        },
      },
      {
        accessorKey: "errorMarkedBy",
        header: "Người đánh dấu",
        cell: ({ row }) => getErrorMarkedByName(row.original.errorMarkedBy),
      },
      {
        accessorKey: "errorMarkedAt",
        header: "Thời gian đánh dấu",
        cell: ({ row }) => {
          const date = row.getValue("errorMarkedAt");
          if (!date) return "---";
          try {
            return format(new Date(date as string), "dd/MM/yyyy HH:mm");
          } catch {
            return date as string;
          }
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const item = row.original;
          const isAnyRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;
          const hasTooManyItems = item.listProduct.length > 50;

          return (
            <RowActions
              onView={() => handleView(item)}
              onAction={!hasTooManyItems ? () => handleRecreate(item) : undefined}
              actionLabel={hasTooManyItems ? undefined : "Tạo lại"}
              actionIcon="check"
              onDelete={canDelete ? () => handleDelete(item) : undefined}
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
    </>
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard
          title="Tổng phiếu lỗi"
          value={stats?.totalErrorReceipts || 0}
          icon={AlertTriangle}
          description="Số phiếu nhập bị đánh dấu lỗi"
        />
        <StatsCard
          title="Tổng giá trị lỗi"
          value={formatCurrency(stats?.totalErrorValue || 0)}
          icon={DollarSign}
          description="Tổng giá trị các phiếu lỗi"
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
          filterPlaceholder="Tìm mã phiếu lỗi..."
          onBulkAction={canDelete ? handleDeleteMany : undefined}
          bulkActionLabel="Xóa đã chọn"
          bulkActionIcon="trash"
          toolbarActions={toolbarActions}
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
        />
      )}

      {/* Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title="Xóa phiếu lỗi?"
        description={`Bạn có chắc chắn muốn xóa phiếu ${selectedItem?.code}? Hành động này không thể hoàn tác.`}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        isSubmitting={isSubmitting}
        title={`Xóa ${selectedItems.length} phiếu lỗi?`}
        description="Bạn có chắc chắn muốn xóa các phiếu đã chọn? Hành động này không thể hoàn tác."
      />

      {/* Detail Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết phiếu lỗi"
        className="max-w-4xl"
        footer={
          <div className="flex gap-2">
            {selectedItem && selectedItem.listProduct.length <= 50 && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleRecreate(selectedItem);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tạo lại phiếu
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDetailOpen(false);
                  if (selectedItem) handleDelete(selectedItem);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa phiếu
              </Button>
            )}
          </div>
        }
      >
        {selectedItem && (
          <div className="grid gap-4 py-4">
            {/* Error Info */}
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-destructive mb-1">Phiếu lỗi</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.errorNote || "Không có ghi chú"}
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Đánh dấu bởi {getErrorMarkedByName(selectedItem.errorMarkedBy)} lúc{" "}
                    {selectedItem.errorMarkedAt && format(new Date(selectedItem.errorMarkedAt), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Mã phiếu</Label>
                <Input value={selectedItem.code} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Trạng thái gốc</Label>
                <Input value={selectedItem.status} readOnly />
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
                <Label className="text-muted-foreground">Ghi chú gốc</Label>
                <Textarea value={selectedItem.note} readOnly rows={2} />
              </div>
            )}

            {/* Products Table */}
            <div className="mt-4">
              <h4 className="mb-2 font-medium">
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
              ) : isMobile ? (
                <ImportReceiptDetailMobile 
                  products={selectedItem.listProduct} 
                  totalAmount={selectedItem.totalAmount}
                />
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
