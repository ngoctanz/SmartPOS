"use client";

import * as React from "react";
import { CommonTable } from "@/components/common/common-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, User, Calendar, AlertTriangle, Trash2 } from "lucide-react";
import { Receipt } from "@/service/receipt.service";
import receiptService from "@/service/receipt.service";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/format.utils";
import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, ExternalLink } from "lucide-react";

interface ErrorReceiptListProps {
  data: Receipt[];
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  searchValue: string;
  isAdmin?: boolean;
  isManager?: boolean;
  onRefresh?: () => void;
}

export function ErrorReceiptList({
  data,
  isLoading,
  pagination,
  onPageChange,
  onSearch,
  searchValue,
  isAdmin = false,
  isManager = false,
  onRefresh,
}: ErrorReceiptListProps) {
  const router = useRouter();
  const canDelete = isAdmin || isManager;

  const [selectedItem, setSelectedItem] = React.useState<Receipt | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Receipt[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleRecreate = (receipt: Receipt) => {
    router.push(`/trang-quan-ly/hoa-don/tao-moi?fromError=${receipt.code}`);
  };

  const handleViewDetail = (receipt: Receipt) => {
    router.push(`/trang-quan-ly/hoa-don/${receipt.code}`);
  };

  const handleDelete = (receipt: Receipt) => {
    setSelectedItem(receipt);
    setIsDeleteOpen(true);
  };

  const handleDeleteMany = (items: Receipt[]) => {
    setSelectedItems(items);
    setSelectedItem(null);
    setIsBulkDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await receiptService.deleteErrorReceipt(selectedItem._id);
      toast.success("Đã xóa hóa đơn lỗi!");
      setIsDeleteOpen(false);
      setSelectedItem(null);
      onRefresh?.();
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
        receiptService.deleteErrorReceipt(item._id)
      );
      await Promise.all(promises);
      toast.success(`Đã xóa ${selectedItems.length} hóa đơn lỗi`);
      setSelectedItems([]);
      setIsBulkDeleteOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Có lỗi xảy ra khi xóa phiếu hoặc bạn ko có quyền thực hiện");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<Receipt>[]>(
    () => [
      ...(canDelete
        ? [
            {
              id: "select",
              header: ({ table }: { table: any }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(value: boolean) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                  aria-label="Select all"
                />
              ),
              cell: ({ row }: { row: any }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                />
              ),
              enableSorting: false,
              enableHiding: false,
            } as ColumnDef<Receipt>,
          ]
        : []),
      {
        accessorKey: "code",
        header: "Mã hóa đơn",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-mono font-medium">{row.original.code}</span>
          </div>
        ),
      },
      {
        accessorKey: "branchId",
        header: "Chi nhánh",
        cell: ({ row }) => {
          const branch = row.original.branchId;
          return typeof branch === "object" ? branch.branchName : "—";
        },
      },
      {
        accessorKey: "totalAmount",
        header: "Tổng tiền",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.totalAmount)}
          </span>
        ),
      },
      {
        accessorKey: "createdBy",
        header: "Người tạo",
        cell: ({ row }) => {
          const creator = row.original.createdBy;
          return (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">
                {typeof creator === "object"
                  ? creator.name || creator.userName
                  : "—"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "markedErrorBy",
        header: "Đánh dấu bởi",
        cell: ({ row }) => {
          const marker = row.original.markedErrorBy;
          return (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">
                {marker && typeof marker === "object"
                  ? marker.name || marker.userName
                  : "—"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")}
          </div>
        ),
      },
      {
        accessorKey: "markedErrorAt",
        header: "Ngày đánh dấu lỗi",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {row.original.markedErrorAt
              ? format(new Date(row.original.markedErrorAt), "dd/MM/yyyy HH:mm")
              : "—"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
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
                <DropdownMenuItem onClick={() => handleViewDetail(row.original)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRecreate(row.original)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tạo lại
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(row.original)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [canDelete]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold">Danh sách hóa đơn lỗi</h3>
          <Badge variant="destructive">{pagination.total}</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            </div>
          </div>
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={data}
          filterCol="code"
          filterPlaceholder="Tìm theo mã hóa đơn..."
          serverPagination={pagination}
          onPageChange={onPageChange}
          onSearch={onSearch}
          searchValue={searchValue}
          onBulkAction={canDelete ? handleDeleteMany : undefined}
          bulkActionLabel="Xóa đã chọn"
          bulkActionIcon="trash"
        />
      )}

      {/* Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title="Xóa hóa đơn lỗi?"
        description={`Bạn có chắc chắn muốn xóa hóa đơn ${selectedItem?.code}? Hành động này không thể hoàn tác.`}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        isSubmitting={isSubmitting}
        title={`Xóa ${selectedItems.length} hóa đơn lỗi?`}
        description="Bạn có chắc chắn muốn xóa các hóa đơn đã chọn? Hành động này không thể hoàn tác."
      />
    </div>
  );
}
