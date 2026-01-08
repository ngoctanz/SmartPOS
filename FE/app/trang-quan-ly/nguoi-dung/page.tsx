"use client";

import * as React from "react";
import { CommonTable } from "@/components/common/common-table";
import { User, UserRole, UserStatus } from "@/types/user";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DetailModal } from "@/components/common/detail-modal";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { userService, branchService } from "@/service";
import {
  Loader2,
  Plus,
  ShieldAlert,
  LayoutGrid,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  UserFormModal,
  CreateUserFormData,
  UpdateUserFormData,
} from "@/components/forms/user-form-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/common/stats-card";
import { useFilteredTableData } from "@/hooks/useFilteredTableData";
import { useStats } from "@/hooks/useStats";

interface BranchOption {
  _id: string;
  branchName: string;
}

// Helper để check có phải admin account không
const isAdminAccount = (user: User) => {
  return user.role === "admin" && user.userName === "admin";
};

// Hiển thị role bằng tiếng Việt
const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: "Quản trị viên",
    staff: "Nhân viên",
  };
  return labels[role] || role;
};

// Hiển thị status bằng tiếng Việt
const getStatusLabel = (status: string) => {
  return status === "active" ? "Hoạt động" : "Ngừng hoạt động";
};

export default function Page() {
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
  } = useFilteredTableData<User, { role?: UserRole; status?: UserStatus }>({
    fetchFn: userService.getAll,
    initialFilters: { role: undefined, status: undefined },
  });

  const { stats } = useStats<{
    total: number;
    active: number;
    inactive: number;
  }>({
    fetchFn: userService.getStats,
  });

  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<User | null>(null);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isBulkActionOpen, setIsBulkActionOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemsToLock, setItemsToLock] = React.useState<User[]>([]);
  const [itemToDelete, setItemToDelete] = React.useState<User | null>(null);

  // Fetch branches
  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await branchService.getAll();
        if (res.data) {
          setBranches(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch branches:", error);
      }
    };
    fetchBranches();
  }, []);

  // Lấy tên chi nhánh từ ID
  const getBranchName = React.useCallback(
    (branchId?: string) => {
      if (!branchId) return "—";
      const branch = branches.find((b) => b._id === branchId);
      return branch?.branchName || "—";
    },
    [branches]
  );

  const handleView = (item: User) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: User) => {
    if (isAdminAccount(item)) {
      toast.error("Không thể chỉnh sửa tài khoản admin");
      return;
    }
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (item: User) => {
    if (isAdminAccount(item)) {
      toast.error("Không thể khóa tài khoản admin");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await userService.toggleStatus(item._id);
      if (response.data) {
        refetch();
        const action = response.data.status === "active" ? "mở khóa" : "khóa";
        toast.success(`Đã ${action} người dùng thành công`);
      }
    } catch (error) {
      console.error("Toggle status error:", error);
      toast.error("Không thể thay đổi trạng thái người dùng");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = (item: User) => {
    if (isAdminAccount(item)) {
      toast.error("Không thể xóa tài khoản admin");
      return;
    }
    setItemToDelete(item);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsSubmitting(true);
      await userService.delete(itemToDelete._id);
      refetch();
      toast.success("Xóa người dùng thành công");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Có lỗi khi xóa người dùng");
    } finally {
      setIsSubmitting(false);
      setIsDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  // Bulk lock handler
  const handleBulkLock = (selectedUsers: User[]) => {
    const validUsers = selectedUsers.filter((u) => !isAdminAccount(u));
    if (validUsers.length === 0) {
      toast.error("Không có người dùng nào có thể khóa");
      return;
    }
    setItemsToLock(validUsers);
    setIsBulkActionOpen(true);
  };

  const confirmBulkLock = async () => {
    if (itemsToLock.length === 0) return;

    try {
      setIsSubmitting(true);
      const ids = itemsToLock.map((user) => user._id);
      await userService.bulkToggleStatus(ids, "inactive");

      refetch();
      toast.success(`Đã khóa ${itemsToLock.length} người dùng thành công`);
    } catch (error) {
      console.error("Bulk lock error:", error);
      toast.error("Có lỗi khi khóa người dùng");
    } finally {
      setIsSubmitting(false);
      setIsBulkActionOpen(false);
      setItemsToLock([]);
    }
  };

  // Kiểm tra row có thể select không (không cho select admin)
  const canSelectRow = (user: User) => !isAdminAccount(user);

  const handleFormSubmit = async (
    formData: CreateUserFormData | UpdateUserFormData
  ) => {
    try {
      setIsSubmitting(true);

      if (selectedItem) {
        await userService.update(selectedItem._id, formData);
        toast.success("Cập nhật người dùng thành công");
      } else {
        await userService.create(formData as CreateUserFormData);
        toast.success("Tạo người dùng thành công");
      }
      refetch();
      setIsFormOpen(false);
      setSelectedItem(null);
    } catch (error: unknown) {
      console.error("Form submit error:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<User>[]>(
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
        cell: ({ row }) => {
          const canSelect = row.getCanSelect();
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              disabled={!canSelect}
              aria-label="Select row"
              className={!canSelect ? "opacity-50 cursor-not-allowed" : ""}
            />
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "userName",
        header: "Tên đăng nhập",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-2">
              <span>{user.userName}</span>
              {isAdminAccount(user) && (
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Họ tên",
        cell: ({ row }) => row.getValue("name") || "---",
      },
      {
        accessorKey: "branchId",
        header: "Chi nhánh",
        cell: ({ row }) => getBranchName(row.getValue("branchId")),
      },
      {
        accessorKey: "role",
        header: "Vai trò",
        cell: ({ row }) => {
          const role = row.getValue("role") as string;
          const variant = role === "admin" ? "destructive" : "secondary";
          return <Badge variant={variant}>{getRoleLabel(role)}</Badge>;
        },
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge variant={status === "active" ? "default" : "secondary"}>
              {getStatusLabel(status)}
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
            return "---";
          }
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const user = row.original;
          const isAdmin = isAdminAccount(user);
          const isActive = user.status === "active";
          const isAnyRowSelected =
            table.getFilteredSelectedRowModel().rows.length > 0;

          return (
            <RowActions
              onView={() => handleView(user)}
              onEdit={isAdmin ? undefined : () => handleEdit(user)}
              onAction={isAdmin ? undefined : () => handleToggleStatus(user)}
              onDelete={isAdmin ? undefined : () => handleDelete(user)}
              actionLabel={isActive ? "Khóa" : "Mở khóa"}
              actionIcon={isActive ? "lock" : "unlock"}
              disabled={isAnyRowSelected}
            />
          );
        },
      },
    ],
    [getBranchName]
  );

  // Custom toolbar actions (Filters)
  const toolbarActions = (
    <>
      <Select
        value={filters.role || "ALL"}
        onValueChange={(value) =>
          updateFilter(
            "role",
            value === "ALL" ? undefined : (value as UserRole)
          )
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Vai trò" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả vai trò</SelectItem>
          <SelectItem value="admin">Quản trị viên</SelectItem>
          <SelectItem value="staff">Nhân viên</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.status || "ALL"}
        onValueChange={(value) =>
          updateFilter(
            "status",
            value === "ALL" ? undefined : (value as UserStatus)
          )
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
          <SelectItem value="active">Hoạt động</SelectItem>
          <SelectItem value="inactive">Đã khóa</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Quản lý người dùng
        </h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm người dùng
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Tổng người dùng"
          value={stats?.total || 0}
          icon={LayoutGrid}
          description="Tổng số tài khoản trong hệ thống"
        />
        <StatsCard
          title="Đang hoạt động"
          value={stats?.active || 0}
          icon={CheckCircle}
          description="Tài khoản đang hoạt động bình thường"
        />
        <StatsCard
          title="Ngừng hoạt động"
          value={stats?.inactive || 0}
          icon={XCircle}
          description="Tài khoản đã bị khóa"
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
          filterCol="userName"
          filterPlaceholder="Tìm theo tên đăng nhập..."
          toolbarActions={toolbarActions}
          onBulkAction={handleBulkLock}
          canSelectRow={canSelectRow}
          bulkActionLabel="Khóa đã chọn"
          bulkActionIcon="lock"
          serverPagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchValue={searchTerm}
        />
      )}

      {/* Form Modal - Thêm / Sửa */}
      <UserFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={selectedItem}
        branches={branches}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Confirm Bulk Lock Dialog */}
      <ConfirmDeleteDialog
        open={isBulkActionOpen}
        onOpenChange={setIsBulkActionOpen}
        onConfirm={confirmBulkLock}
        isSubmitting={isSubmitting}
        title={`Khóa ${itemsToLock.length} người dùng?`}
        description={`Bạn đang khóa: ${itemsToLock
          .map((u) => u.name || u.userName)
          .join(
            ", "
          )}. Các người dùng này sẽ không thể đăng nhập vào hệ thống.`}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isSubmitting={isSubmitting}
        title="Xóa người dùng?"
        description={`Bạn có chắc chắn muốn xóa người dùng "${
          itemToDelete?.name || itemToDelete?.userName
        }"? Hành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.`}
      />

      {/* Detail Modal - Xem chi tiết */}
      <DetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết người dùng"
        onEdit={
          selectedItem && !isAdminAccount(selectedItem)
            ? () => {
                setIsDetailOpen(false);
                handleEdit(selectedItem);
              }
            : undefined
        }
      >
        {selectedItem && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium text-muted-foreground">
                Username
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <span>{selectedItem.userName}</span>
                {isAdminAccount(selectedItem) && (
                  <Badge variant="destructive">Admin</Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium text-muted-foreground">
                Họ tên
              </Label>
              <span className="col-span-3">{selectedItem.name || "---"}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium text-muted-foreground">
                Chi nhánh
              </Label>
              <span className="col-span-3">
                {getBranchName(selectedItem.branchId)}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium text-muted-foreground">
                Vai trò
              </Label>
              <span className="col-span-3">
                <Badge
                  variant={
                    selectedItem.role === "admin" ? "destructive" : "secondary"
                  }
                >
                  {getRoleLabel(selectedItem.role)}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium text-muted-foreground">
                Trạng thái
              </Label>
              <span className="col-span-3">
                <Badge
                  variant={
                    selectedItem.status === "active" ? "default" : "secondary"
                  }
                >
                  {getStatusLabel(selectedItem.status)}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium text-muted-foreground">
                Ngày tạo
              </Label>
              <span className="col-span-3">
                {selectedItem.createdAt
                  ? format(new Date(selectedItem.createdAt), "dd/MM/yyyy HH:mm")
                  : "---"}
              </span>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
