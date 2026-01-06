"use client";

import * as React from "react";
import { CommonTable } from "@/components/common/common-table";
import { User } from "@/types/user";
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
import { Loader2, Plus, ShieldAlert } from "lucide-react";
import {
  UserFormModal,
  CreateUserFormData,
  UpdateUserFormData,
} from "@/components/forms/user-form-modal";

interface BranchOption {
  _id: string;
  name: string;
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
  const [data, setData] = React.useState<User[]>([]);
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedItem, setSelectedItem] = React.useState<User | null>(null);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isBulkActionOpen, setIsBulkActionOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemsToLock, setItemsToLock] = React.useState<User[]>([]);

  // Fetch data on mount
  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, branchesRes] = await Promise.all([
        userService.getAll(),
        branchService.getAll(),
      ]);

      if (usersRes.data) {
        setData(usersRes.data);
      }
      if (branchesRes.data) {
        setBranches(branchesRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Lấy tên chi nhánh từ ID
  const getBranchName = React.useCallback(
    (branchId?: string) => {
      if (!branchId) return "---";
      const branch = branches.find((b) => b._id === branchId);
      return branch?.name || branchId;
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
        setData((prev) =>
          prev.map((i) => (i._id === item._id ? response.data! : i))
        );
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

      // Update local state using functional update
      const idsSet = new Set(ids);
      setData((prev) =>
        prev.map((user) =>
          idsSet.has(user._id) ? { ...user, status: "inactive" } : user
        )
      );
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
        // Update
        const response = await userService.update(selectedItem._id, formData);
        if (response.data) {
          setData(
            data.map((item) =>
              item._id === selectedItem._id ? response.data! : item
            )
          );
          toast.success("Cập nhật người dùng thành công");
        }
      } else {
        // Create
        const response = await userService.create(
          formData as CreateUserFormData
        );
        if (response.data) {
          setData([...data, response.data]);
          toast.success("Tạo người dùng thành công");
        }
      }
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
        cell: ({ row }) => {
          const user = row.original;
          const isAdmin = isAdminAccount(user);
          const isActive = user.status === "active";

          return (
            <RowActions
              onView={() => handleView(user)}
              onEdit={isAdmin ? undefined : () => handleEdit(user)}
              onAction={isAdmin ? undefined : () => handleToggleStatus(user)}
              actionLabel={isActive ? "Khóa" : "Mở khóa"}
              actionIcon={isActive ? "lock" : "unlock"}
            />
          );
        },
      },
    ],
    [getBranchName]
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Quản lý người dùng
        </h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm người dùng
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={data}
          filterCol="name"
          filterPlaceholder="Tìm theo tên..."
          onBulkAction={handleBulkLock}
          canSelectRow={canSelectRow}
          bulkActionLabel="Khóa đã chọn"
          bulkActionIcon="lock"
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
