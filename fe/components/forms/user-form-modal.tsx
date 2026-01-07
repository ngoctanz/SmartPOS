"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, UserRole, UserStatus } from "@/types/user";
import { Loader2, Eye, EyeOff } from "lucide-react";

// Schema tạo mới user
const createUserSchema = z.object({
  userName: z
    .string()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(15, "Tên đăng nhập tối đa 15 ký tự")
    .regex(/^\S+$/, "Tên đăng nhập không được có khoảng trắng"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(25, "Mật khẩu tối đa 25 ký tự")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{6,25}$/,
      "Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số"
    ),
  name: z.string().max(100, "Họ tên tối đa 100 ký tự").optional(),
  role: z.enum(["admin", "staff"]),
  branchId: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

// Schema cập nhật user (không có userName, password optional)
const updateUserSchema = z.object({
  name: z.string().max(100, "Họ tên tối đa 100 ký tự").optional(),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(25, "Mật khẩu tối đa 25 ký tự")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{6,25}$/,
      "Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số"
    )
    .optional()
    .or(z.literal("")), // Allow empty string
  role: z.enum(["admin", "staff"]),
  branchId: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface Branch {
  _id: string;
  branchName: string;
}

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null; // null = create mode
  branches: Branch[];
  onSubmit: (data: CreateUserFormData | UpdateUserFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Quản trị viên" },
  { value: "staff", label: "Nhân viên" },
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

export function UserFormModal({
  open,
  onOpenChange,
  user,
  branches,
  onSubmit,
  isSubmitting = false,
}: UserFormModalProps) {
  const isEditMode = !!user;
  const [showPassword, setShowPassword] = React.useState(false);

  const schema = isEditMode ? updateUserSchema : createUserSchema;

  const form = useForm<CreateUserFormData | UpdateUserFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      userName: "",
      name: "",
      role: "staff",
      branchId: "",
      status: "active",
      ...(isEditMode ? {} : { password: "" }),
    },
  });

  // Reset form khi modal mở hoặc user thay đổi
  React.useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          userName: user.userName || "",
          name: user.name || "",
          role: user.role || "staff",
          branchId: user.branchId || "",
          status: user.status || "active",
        });
      } else {
        form.reset({
          userName: "",
          password: "",
          name: "",
          role: "staff",
          branchId: "",
          status: "active",
        });
      }
    }
  }, [open, user, form]);

  const handleSubmit = async (
    data: CreateUserFormData | UpdateUserFormData
  ) => {
   
    const processedData = { ...data };
    if (!processedData.branchId || processedData.branchId === "") {
      processedData.branchId = null as any; 
    }
    
    // Remove empty password when updating
    if (isEditMode) {
      const updateData = processedData as UpdateUserFormData;
      if (!updateData.password || updateData.password === "") {
        delete updateData.password;
      }
      // Remove userName if present
      if ('userName' in updateData) {
        delete (updateData as any).userName;
      }
      await onSubmit(updateData);
    } else {
      await onSubmit(processedData as CreateUserFormData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Cập nhật thông tin người dùng"
              : "Điền thông tin để tạo người dùng mới"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="userName">
              Tên đăng nhập <span className="text-destructive">*</span>
            </Label>
            <Input
              id="userName"
              {...form.register("userName" as any)}
              placeholder="Nhập tên đăng nhập"
              disabled={isEditMode} // Không cho sửa username
            />
            {(form.formState.errors as any).userName && (
              <p className="text-sm text-destructive">
                {(form.formState.errors as any).userName.message}
              </p>
            )}
          </div>

          {/* Password - hiện cho cả tạo mới và chỉnh sửa */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Mật khẩu {!isEditMode && <span className="text-destructive">*</span>}
              {isEditMode && <span className="text-muted-foreground text-xs ml-1">(để trống nếu không đổi)</span>}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...form.register("password" as keyof CreateUserFormData)}
                placeholder={isEditMode ? "Nhập mật khẩu mới (nếu muốn đổi)" : "Nhập mật khẩu"}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {(form.formState.errors as { password?: { message?: string } })
              .password && (
              <p className="text-sm text-destructive">
                {
                  (
                    form.formState.errors as {
                      password?: { message?: string };
                    }
                  ).password?.message
                }
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Họ tên</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Nhập họ tên"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Role & Status row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-2">
              <Label>
                Vai trò <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value: UserRole) =>
                  form.setValue("role", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>
                Trạng thái <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value: UserStatus) =>
                  form.setValue("status", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label>Chi nhánh</Label>
            <Select
              value={form.watch("branchId") || "none"}
              onValueChange={(value) =>
                form.setValue("branchId", value === "none" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn chi nhánh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không có</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditMode ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
