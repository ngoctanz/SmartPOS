"use client";

import * as React from "react";
import { CommonTable } from "@/components/common/common-table";
import { Branch } from "@/service/branch.service";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DetailModal } from "@/components/common/detail-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import branchService from "@/service/branch.service";
import { Button } from "@/components/ui/button";
import {
  Plus,
  LayoutGrid,
  RotateCcw,
  Archive,
  Loader2,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { StatsCard } from "@/components/common/stats-card";
import { useTableData } from "@/hooks/useTableData";
import { useStats } from "@/hooks/useStats";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Page() {
  // Tab state: "active" | "deleted"
  const [viewMode, setViewMode] = React.useState<"active" | "deleted">(
    "active"
  );

  // Use custom hooks - fetch all including deleted for tab view
  const {
    data,
    searchTerm,
    pagination,
    handlePageChange,
    handleSearch,
    refetch,
  } = useTableData<Branch>({
    fetchFn: (params) =>
      branchService.getAll({ ...params, includeDeleted: true }),
  });

  const { stats, refetch: refetchStats } = useStats<{ total: number }>({
    fetchFn: branchService.getStats,
  });

  // Filter data based on viewMode
  const filteredData = React.useMemo(() => {
    if (viewMode === "deleted") {
      return data.filter((item) => item.isDeleted);
    }
    return data.filter((item) => !item.isDeleted);
  }, [data, viewMode]);

  // Count deleted branches
  const deletedCount = React.useMemo(() => {
    return data.filter((item) => item.isDeleted).length;
  }, [data]);

  const [selectedItem, setSelectedItem] = React.useState<Branch | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Branch[]>([]);

  // Modal states
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = React.useState(false);
  const [isHardDeleteOpen, setIsHardDeleteOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    branchName: "",
    address: "",
    contactInfo: "",
    PAYOS_CLIENT_ID: "",
    PAYOS_API_KEY: "",
    PAYOS_CHECKSUM_KEY: "",
  });

  const handleCreate = () => {
    setSelectedItem(null);
    setFormData({
      branchName: "",
      address: "",
      contactInfo: "",
      PAYOS_CLIENT_ID: "",
      PAYOS_API_KEY: "",
      PAYOS_CHECKSUM_KEY: "",
    });
    setIsEdit(true);
    setIsDetailOpen(true);
  };

  const handleView = (item: Branch) => {
    setSelectedItem(item);
    setFormData({
      branchName: item.branchName,
      address: item.address,
      contactInfo: item.contactInfo || "",
      PAYOS_CLIENT_ID: item.PAYOS_CLIENT_ID || "",
      PAYOS_API_KEY: item.PAYOS_API_KEY || "",
      PAYOS_CHECKSUM_KEY: item.PAYOS_CHECKSUM_KEY || "",
    });
    setIsEdit(false);
    setIsDetailOpen(true);
  };

  const handleEdit = (item: Branch) => {
    setSelectedItem(item);
    setFormData({
      branchName: item.branchName,
      address: item.address,
      contactInfo: item.contactInfo || "",
      PAYOS_CLIENT_ID: item.PAYOS_CLIENT_ID || "",
      PAYOS_API_KEY: item.PAYOS_API_KEY || "",
      PAYOS_CHECKSUM_KEY: item.PAYOS_CHECKSUM_KEY || "",
    });
    setIsEdit(true);
    setIsDetailOpen(true);
  };

  const handleDelete = (item: Branch) => {
    setSelectedItem(item);
    setSelectedItems([]);
    setIsDeleteOpen(true);
  };

  const handleDeleteMany = (items: Branch[]) => {
    setSelectedItems(items);
    setSelectedItem(null);
    setIsDeleteOpen(true);
  };

  const handleRestore = (item: Branch) => {
    setSelectedItem(item);
    setIsRestoreOpen(true);
  };

  const handleHardDelete = (item: Branch) => {
    setSelectedItem(item);
    setIsHardDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      if (selectedItem) {
        await branchService.remove(selectedItem._id);
        toast.success("Đã ngưng hoạt động chi nhánh");
      } else if (selectedItems.length > 0) {
        await branchService.deleteMany(selectedItems.map((item) => item._id));
        toast.success(`Đã ngưng hoạt động ${selectedItems.length} chi nhánh`);
        setSelectedItems([]);
      }
      refetch();
      refetchStats();
    } catch (error) {
      toast.error("Thao tác thất bại");
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setIsDeleteOpen(false);
      setSelectedItem(null);
    }
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await branchService.restore(selectedItem._id);
      toast.success("Đã khôi phục chi nhánh thành công");
      refetch();
      refetchStats();
    } catch (error) {
      toast.error("Khôi phục thất bại");
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setIsRestoreOpen(false);
      setSelectedItem(null);
    }
  };

  const confirmHardDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await branchService.hardDelete(selectedItem._id);
      toast.success("Đã xóa vĩnh viễn chi nhánh");
      refetch();
      refetchStats();
    } catch (error: any) {
      toast.error(error?.message || "Xóa thất bại");
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setIsHardDeleteOpen(false);
      setSelectedItem(null);
    }
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      if (selectedItem) {
        await branchService.update(selectedItem._id, formData);
        toast.success("Cập nhật chi nhánh thành công");
      } else {
        await branchService.create(formData);
        toast.success("Tạo chi nhánh thành công");
      }
      setIsDetailOpen(false);
      refetch();
      refetchStats();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Columns for active branches
  const activeColumns = React.useMemo<ColumnDef<Branch>[]>(
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
        accessorKey: "branchName",
        header: "Tên chi nhánh",
      },
      {
        accessorKey: "address",
        header: "Địa chỉ",
      },
      {
        accessorKey: "contactInfo",
        header: "Liên hệ",
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
        enableHiding: false,
        cell: ({ row, table }) => {
          const item = row.original;
          const isAnyRowSelected =
            table.getFilteredSelectedRowModel().rows.length > 0;
          return (
            <RowActions
              onView={() => handleView(item)}
              onEdit={() => handleEdit(item)}
              onAction={() => handleDelete(item)}
              actionLabel="Ngưng hoạt động"
              actionIcon="lock"
              disabled={isAnyRowSelected}
            />
          );
        },
      },
    ],
    []
  );

  // Columns for deleted branches (no select, different actions)
  const deletedColumns = React.useMemo<ColumnDef<Branch>[]>(
    () => [
      {
        accessorKey: "branchName",
        header: "Tên chi nhánh",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {row.getValue("branchName")}
            </span>
            <Badge variant="secondary" className="text-xs">
              Đã ngưng
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "address",
        header: "Địa chỉ",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("address")}
          </span>
        ),
      },
      {
        accessorKey: "contactInfo",
        header: "Liên hệ",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("contactInfo") || "—"}
          </span>
        ),
      },
      {
        accessorKey: "deletedAt",
        header: "Ngày ngưng",
        cell: ({ row }) => {
          try {
            const deletedAt = row.original.deletedAt;
            return deletedAt
              ? format(new Date(deletedAt), "dd/MM/yyyy HH:mm")
              : "—";
          } catch {
            return "—";
          }
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DeletedBranchActions
              branch={item}
              onRestore={handleRestore}
              onHardDelete={handleHardDelete}
            />
          );
        },
      },
    ],
    []
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
          Quản lý chi nhánh
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleCreate} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Thêm mới
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <StatsCard
          title="Chi nhánh hoạt động"
          value={stats?.total || 0}
          icon={LayoutGrid}
          description="Số lượng chi nhánh đang hoạt động"
        />
        <StatsCard
          title="Đã ngưng hoạt động"
          value={deletedCount}
          icon={Archive}
          description="Chi nhánh đã ngưng hoạt động"
          trend={deletedCount > 0 ? "neutral" : undefined}
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "active" | "deleted")}
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
            <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Đang hoạt động ({stats?.total || 0})</span>
            <span className="sm:hidden">Hoạt động ({stats?.total || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
            <Archive className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Đã ngưng ({deletedCount})</span>
            <span className="sm:hidden">Ngưng ({deletedCount})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === "active" ? (
        <CommonTable
          columns={activeColumns}
          data={filteredData}
          filterCol="branchName"
          filterPlaceholder="Tìm chi nhánh..."
          onBulkAction={handleDeleteMany}
          bulkActionLabel="Ngưng hoạt động"
          bulkActionIcon="lock"
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
        />
      ) : (
        <CommonTable
          columns={deletedColumns}
          data={filteredData}
          filterCol="branchName"
          filterPlaceholder="Tìm chi nhánh đã ngưng..."
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
        />
      )}

      {/* Confirm Dialog - Updated for soft delete */}
      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title={
          selectedItem
            ? `Ngưng hoạt động chi nhánh "${selectedItem?.branchName}"?`
            : `Ngưng hoạt động ${selectedItems.length} chi nhánh?`
        }
        description={
          selectedItem
            ? "Chi nhánh sẽ được chuyển sang trạng thái ngưng hoạt động. Dữ liệu lịch sử (hóa đơn, phiếu nhập) vẫn được giữ nguyên. Bạn có thể khôi phục chi nhánh bất cứ lúc nào."
            : "Các chi nhánh đã chọn sẽ được chuyển sang trạng thái ngưng hoạt động. Dữ liệu lịch sử vẫn được giữ nguyên và có thể khôi phục."
        }
        confirmLabel="Ngưng hoạt động"
        variant="default"
      />

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục chi nhánh?</AlertDialogTitle>
            <AlertDialogDescription>
              Chi nhánh "{selectedItem?.branchName}" sẽ được khôi phục và hoạt
              động trở lại bình thường.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : "Khôi phục"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail/Edit Modal */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={
          isEdit
            ? selectedItem
              ? "Chỉnh sửa chi nhánh"
              : "Thêm mới chi nhánh"
            : "Chi tiết chi nhánh"
        }
        onEdit={!isEdit ? () => setIsEdit(true) : undefined}
        maxWidth="xl"
        footer={
          isEdit ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDetailOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-6">
          {/* Thông tin cơ bản */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Thông tin chi nhánh
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchName">
                  Tên chi nhánh <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="branchName"
                  value={formData.branchName}
                  onChange={(e) =>
                    setFormData({ ...formData, branchName: e.target.value })
                  }
                  readOnly={!isEdit}
                  disabled={!isEdit}
                  placeholder="VD: Chi nhánh Quận 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">
                  Địa chỉ <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  readOnly={!isEdit}
                  disabled={!isEdit}
                  placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactInfo">Thông tin liên hệ</Label>
                <Input
                  id="contactInfo"
                  value={formData.contactInfo}
                  onChange={(e) =>
                    setFormData({ ...formData, contactInfo: e.target.value })
                  }
                  readOnly={!isEdit}
                  disabled={!isEdit}
                  placeholder="VD: 0901234567, email@example.com"
                />
              </div>
            </div>
          </div>

          {/* PayOS Credentials Section */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Cấu hình thanh toán PayOS
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Tùy chọn
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Để sử dụng thanh toán chuyển khoản qua PayOS cho chi nhánh này,
              vui lòng điền các thông tin bên dưới.
            </p>
            <div className="grid gap-4 sm:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="payos_client_id" className="text-sm">
                  Client ID
                </Label>
                <Input
                  id="payos_client_id"
                  value={formData.PAYOS_CLIENT_ID}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      PAYOS_CLIENT_ID: e.target.value,
                    })
                  }
                  readOnly={!isEdit}
                  disabled={!isEdit}
                  placeholder="Nhập Client ID từ PayOS"
                  type={isEdit ? "text" : "password"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payos_api_key" className="text-sm">
                  API Key
                </Label>
                <Input
                  id="payos_api_key"
                  value={formData.PAYOS_API_KEY}
                  onChange={(e) =>
                    setFormData({ ...formData, PAYOS_API_KEY: e.target.value })
                  }
                  readOnly={!isEdit}
                  disabled={!isEdit}
                  placeholder="Nhập API Key từ PayOS"
                  type={isEdit ? "text" : "password"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payos_checksum_key" className="text-sm">
                  Checksum Key
                </Label>
                <Input
                  id="payos_checksum_key"
                  value={formData.PAYOS_CHECKSUM_KEY}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      PAYOS_CHECKSUM_KEY: e.target.value,
                    })
                  }
                  readOnly={!isEdit}
                  disabled={!isEdit}
                  placeholder="Nhập Checksum Key từ PayOS"
                  type={isEdit ? "text" : "password"}
                />
              </div>
            </div>
            {isEdit && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                💡 Lấy thông tin này từ{" "}
                <a
                  href="https://my.payos.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  PayOS Dashboard
                </a>{" "}
                → Channels → Chọn kênh thanh toán → Xem API Keys
              </p>
            )}
          </div>
        </div>
      </DetailModal>

      {/* Hard Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isHardDeleteOpen}
        onOpenChange={setIsHardDeleteOpen}
        onConfirm={confirmHardDelete}
        isSubmitting={isSubmitting}
        title={`Xóa vĩnh viễn chi nhánh "${selectedItem?.branchName}"?`}
        description="Hành động này không thể hoàn tác. Chi nhánh sẽ bị xóa vĩnh viễn khỏi hệ thống."
        confirmLabel="Xóa vĩnh viễn"
        variant="destructive"
      />
    </div>
  );
}

// Component hiển thị actions cho chi nhánh đã ngưng
function DeletedBranchActions({
  branch,
  onRestore,
  onHardDelete,
}: {
  branch: Branch;
  onRestore: (branch: Branch) => void;
  onHardDelete: (branch: Branch) => void;
}) {
  const [canDelete, setCanDelete] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    const checkCanDelete = async () => {
      setChecking(true);
      try {
        const res = await branchService.checkCanDelete(branch._id);
        if (res.success && res.data) {
          setCanDelete(res.data.canDelete);
        }
      } catch (error) {
        console.error("Failed to check can delete:", error);
        setCanDelete(false);
      } finally {
        setChecking(false);
      }
    };
    checkCanDelete();
  }, [branch._id]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onRestore(branch)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Khôi phục
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onHardDelete(branch)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa vĩnh viễn
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
