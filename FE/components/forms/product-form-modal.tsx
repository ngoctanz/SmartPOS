"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
} from "@/service/product.service";
import { Category } from "@/service/category.service";
import { Branch } from "@/service/branch.service";
import { MultipleImageUpload } from "@/components/common/multiple-image-upload";
import {
  Package,
  CircleDollarSign,
  Layers,
  Info,
  PlusCircle,
  PencilLine,
  ChevronRight,
  Store,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import uploadService from "@/service/upload.service";
import { toast } from "sonner";

// Schema validation cơ bản (cho import mode hoặc mode thường)
const productSchema = z.object({
  name: z
    .string()
    .min(1, "Tên sản phẩm là bắt buộc")
    .max(200, "Tên sản phẩm tối đa 200 ký tự"),
  barcode: z
    .string()
    .max(50, "Mã vạch tối đa 50 ký tự")
    .optional()
    .or(z.literal("")),
  categoryId: z.string().min(1, "Vui lòng chọn loại sản phẩm"),
  unit: z.string().min(1, "Đơn vị là bắt buộc"),
  currentSalePrice: z.coerce.number().min(0, "Giá bán không được âm"),
  status: z.enum(["active", "inactive"]),
  desc: z.string().max(1000, "Mô tả tối đa 1000 ký tự").optional(),
  images: z.array(z.string()).optional(),
  // Inventory mode fields (admin only)
  branchId: z.string().optional(),
  productCode: z
    .string()
    .max(50, "Mã hàng tối đa 50 ký tự")
    .optional()
    .or(z.literal("")),
  importPrice: z.coerce.number().min(0, "Giá nhập không được âm").optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// Extended data type cho inventory mode
export interface InventoryProductFormData extends CreateProductRequest {
  branchId?: string;
  productCode?: string;
  importPrice?: number;
}

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  onSubmit: (
    data:
      | CreateProductRequest
      | UpdateProductRequest
      | InventoryProductFormData,
  ) => Promise<void>;
  isSubmitting?: boolean;
  /** Mode for import page - shows warning about shared product */
  isImportMode?: boolean;
  /** Inventory mode - shows branch selector and extra fields for admin */
  isInventoryMode?: boolean;
  /** List of branches for inventory mode (admin) */
  branches?: Branch[];
  /** Whether the current user is admin */
  isAdmin?: boolean;
  /** Default branch ID to select (for inventory mode) */
  defaultBranchId?: string;
  /** Edit mode for aggregated view - only allow editing common product fields */
  isAggregatedEdit?: boolean;
}

const UNIT_OPTIONS = [
  { value: "cái", label: "Cái" },
  { value: "hộp", label: "Hộp" },
  { value: "ly", label: "Ly" },
  { value: "chai", label: "Chai" },
  { value: "lon", label: "Lon" },
  { value: "kg", label: "Kg" },
  { value: "gram", label: "Gram" },
  { value: "gói", label: "Gói" },
  { value: "phần", label: "Phần" },
];

// Helper to extract categoryId from populated object
const getCategoryId = (categoryId: Product["categoryId"]): string => {
  if (typeof categoryId === "object" && categoryId?._id) {
    return categoryId._id;
  }
  return String(categoryId || "");
};

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  categories,
  onSubmit,
  isSubmitting = false,
  isImportMode = false,
  isInventoryMode = false,
  branches = [],
  isAdmin = false,
  defaultBranchId,
  isAggregatedEdit = false,
}: ProductFormModalProps) {
  const isEditMode = !!product && !!product._id;
  const [selectedImageFiles, setSelectedImageFiles] = React.useState<File[]>(
    [],
  );
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  // Show inventory fields only in inventory mode AND for admin AND NOT in aggregated edit
  const showInventoryFields = isInventoryMode && isAdmin && !isAggregatedEdit;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      categoryId: "",
      unit: "cái",
      currentSalePrice: 0,
      status: "active",
      desc: "",
      images: [],
      branchId: "",
      productCode: "",
      importPrice: 0,
    },
  });

  // Reset form when modal opens or product changes
  React.useEffect(() => {
    if (open) {
      setSelectedImageFiles([]);
      if (product) {
        form.reset({
          name: product.name || "",
          barcode: product.barcode || "",
          categoryId: getCategoryId(product.categoryId),
          unit: product.unit || "cái",
          currentSalePrice: product.currentSalePrice || 0,
          status: product.status || "active",
          desc: product.desc || "",
          images: product.images || [],
          branchId: defaultBranchId || (product as any).branchId || "",
          productCode: (product as any).productCode || "",
          importPrice:
            (product as any).importPrice ||
            (product as any).lastImportPrice ||
            0,
        });
      } else {
        form.reset({
          name: "",
          barcode: "",
          categoryId: "",
          unit: "cái",
          currentSalePrice: 0,
          status: "active",
          desc: "",
          images: [],
          branchId: defaultBranchId || "",
          productCode: "",
          importPrice: 0,
        });
      }
    } else {
      // Clean up blob URLs when modal closes
      const imageValues = form.getValues("images") || [];
      imageValues.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    }
  }, [open, product, form, defaultBranchId]);

  const onFormSubmit = async (values: ProductFormData) => {
    try {
      // Validation cho inventory mode
      if (showInventoryFields && !values.branchId) {
        toast.error("Vui lòng chọn chi nhánh!");
        return;
      }

      let imageUrls = values.images || [];

      // If there are new image files selected, upload them first
      if (selectedImageFiles.length > 0) {
        setIsUploadingImage(true);
        toast.info(`Đang tải lên ${selectedImageFiles.length} ảnh...`);

        const uploadPromises = selectedImageFiles.map((file) =>
          uploadService.uploadImage(file),
        );

        const uploadResponses = await Promise.all(uploadPromises);
        const newImageUrls = uploadResponses
          .filter((res) => res.data)
          .map((res) => res.data!.url);

        if (newImageUrls.length > 0) {
          // Keep existing uploaded URLs (not blob URLs) and add new ones
          const existingUploadedUrls = imageUrls.filter(
            (url) => !url.startsWith("blob:") && url.trim() !== "",
          );
          imageUrls = [...existingUploadedUrls, ...newImageUrls];
          toast.success(`Đã tải lên ${newImageUrls.length} ảnh mới!`);
        } else {
          throw new Error("Upload ảnh thất bại");
        }

        setIsUploadingImage(false);
      } else {
        // No new files, just keep existing uploaded URLs
        imageUrls = imageUrls.filter(
          (url) => !url.startsWith("blob:") && url.trim() !== "",
        );
      }

      // Prepare clean data based on mode
      if (isAggregatedEdit) {
        // Aggregated edit: Only send common product fields, NO pricing/inventory fields
        const cleanData: UpdateProductRequest = {
          name: values.name,
          categoryId: values.categoryId,
          unit: values.unit,
          barcode: values.barcode || undefined,
          desc: values.desc || undefined,
          images: imageUrls.length > 0 ? imageUrls : undefined,
          status: values.status,
          // Explicitly exclude pricing and inventory fields
        };
        await onSubmit(cleanData);
      } else if (showInventoryFields) {
        // Inventory mode (create or edit specific branch)
        const cleanData: InventoryProductFormData = {
          name: values.name,
          categoryId: values.categoryId,
          unit: values.unit,
          currentSalePrice: values.currentSalePrice,
          barcode: values.barcode || undefined,
          desc: values.desc || undefined,
          images: imageUrls.length > 0 ? imageUrls : undefined,
          status: values.status,
        };

        // branchId only for create mode (can't change branch after creation)
        if (!isEditMode) {
          cleanData.branchId = values.branchId;
        }
        // productCode and importPrice can be updated
        cleanData.productCode = values.productCode || undefined;
        cleanData.importPrice = values.importPrice || undefined;

        await onSubmit(cleanData);
      } else {
        // Normal mode: Standard product fields
        const cleanData: CreateProductRequest | UpdateProductRequest = {
          name: values.name,
          categoryId: values.categoryId,
          unit: values.unit,
          currentSalePrice: values.currentSalePrice,
          barcode: values.barcode || undefined,
          desc: values.desc || undefined,
          images: imageUrls.length > 0 ? imageUrls : undefined,
          status: values.status,
        };
        await onSubmit(cleanData);
      }

      // Clean up blob URLs after successful submission
      (values.images || []).forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      setIsUploadingImage(false);
      toast.error("Có lỗi xảy ra khi xử lý ảnh!");
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* Custom Header */}
          <div className="bg-primary/5 px-5 py-3.5 border-b flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-primary">
              {isEditMode ? (
                <PencilLine className="w-5 h-5" />
              ) : (
                <PlusCircle className="w-5 h-5" />
              )}
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEditMode ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground ml-7">
              {isImportMode
                ? "Tạo sản phẩm mới từ mã barcode vừa quét."
                : isAggregatedEdit
                  ? "Chỉnh sửa thông tin chung của sản phẩm (áp dụng cho tất cả chi nhánh)."
                  : isInventoryMode
                    ? "Thêm sản phẩm mới vào kho chi nhánh."
                    : isEditMode
                      ? "Thực hiện các thay đổi cho thông tin sản phẩm của bạn tại đây."
                      : "Điền các thông tin bên dưới để thêm một sản phẩm mới vào thực đơn."}
            </DialogDescription>
          </div>

          {/* Info for inventory mode - Only show when creating new product */}
          {showInventoryFields && !isEditMode && (
            <div className="mx-5 mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Store className="h-4 w-4 flex-shrink-0" />
                Chế độ quản lý kho
              </p>
              <ul className="mt-2 text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>
                  Sản phẩm sẽ được tạo và thêm vào kho của{" "}
                  <strong>chi nhánh bạn chọn</strong>
                </li>
                <li>
                  Số lượng mặc định là <strong>0</strong> - nhập kho để thêm số
                  lượng
                </li>
                <li>Giá bán có thể khác giá niêm yết theo từng chi nhánh</li>
              </ul>
            </div>
          )}

          <form
            onSubmit={form.handleSubmit(onFormSubmit)}
            className="flex-1 overflow-y-auto"
          >
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
                {/* Left Column: Media */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Hình ảnh sản phẩm
                    </Label>
                    <div className="relative group rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-2 transition-all hover:border-primary/50 hover:bg-muted/50">
                      <MultipleImageUpload
                        value={form.watch("images") || []}
                        onChange={(urls) => form.setValue("images", urls)}
                        onFilesSelect={setSelectedImageFiles}
                        disabled={isSubmitting || isUploadingImage}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-border/50">
                      <p className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[9px]">
                        <Info className="w-3 h-3" />
                        Gợi ý
                      </p>
                      <ul className="space-y-0.5 ml-1 opacity-80">
                        <li>• Không giới hạn số lượng</li>
                        <li>• Ảnh đầu tiên là ảnh chính</li>
                        <li>• Max 5MB/ảnh (JPG, PNG)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right Column: Detailed Form */}
                <div className="space-y-6">
                  {/* Section: Branch Selection (Inventory Mode Only - Hide in Edit Mode) */}
                  {showInventoryFields && !isEditMode && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-border/50">
                        <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                          <Store className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-sm">Chi nhánh</h3>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="branchId"
                          className="text-xs font-medium"
                        >
                          Chọn chi nhánh{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={form.watch("branchId")}
                          onValueChange={(value) =>
                            form.setValue("branchId", value)
                          }
                        >
                          <SelectTrigger
                            id="branchId"
                            className={cn(
                              "w-full h-10 text-sm transition-all focus:ring-2 focus:ring-primary/20",
                              !form.watch("branchId") &&
                                "text-muted-foreground",
                            )}
                          >
                            <SelectValue placeholder="Chọn chi nhánh..." />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.length > 0 ? (
                              branches.map((branch) => (
                                <SelectItem key={branch._id} value={branch._id}>
                                  {branch.branchName}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-center text-muted-foreground">
                                Không có chi nhánh nào
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Basic Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/50">
                      <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h3 className="font-bold text-sm">Thông tin cơ bản</h3>
                    </div>

                    <div className="grid gap-4">
                      {/* Name Field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-medium">
                          Tên sản phẩm{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          {...form.register("name")}
                          placeholder="Ví dụ: Cà phê sữa đá..."
                          className={cn(
                            "h-10 text-sm transition-all focus:ring-2 focus:ring-primary/20",
                            form.formState.errors.name &&
                              "border-destructive focus:ring-destructive/20",
                          )}
                        />
                        {form.formState.errors.name && (
                          <p className="text-[11px] font-medium text-destructive mt-1 flex items-center gap-1">
                            <Info className="w-2.5 h-2.5" />
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      {/* Barcode Field */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="barcode"
                          className="text-xs font-medium"
                        >
                          Mã Barcode
                          {isImportMode && (
                            <span className="ml-2 text-muted-foreground">
                              (từ máy quét)
                            </span>
                          )}
                        </Label>
                        <Input
                          id="barcode"
                          {...form.register("barcode")}
                          placeholder="Nhập hoặc quét mã barcode..."
                          readOnly={isImportMode}
                          className={cn(
                            "h-10 text-sm transition-all focus:ring-2 focus:ring-primary/20",
                            isImportMode && "bg-muted font-mono",
                            form.formState.errors.barcode &&
                              "border-destructive focus:ring-destructive/20",
                          )}
                        />
                        {form.formState.errors.barcode && (
                          <p className="text-[11px] font-medium text-destructive mt-1 flex items-center gap-1">
                            <Info className="w-2.5 h-2.5" />
                            {form.formState.errors.barcode.message}
                          </p>
                        )}
                      </div>

                      {/* Product Code (Inventory Mode) */}
                      {showInventoryFields && (
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="productCode"
                            className="text-xs font-medium"
                          >
                            Mã hàng (theo chi nhánh)
                            <span className="ml-2 text-muted-foreground text-[10px]">
                              SKU riêng
                            </span>
                          </Label>
                          <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="productCode"
                              {...form.register("productCode")}
                              placeholder="VD: SP001, CAFE-001..."
                              className="h-10 pl-10 text-sm font-mono transition-all focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-[70%_1fr] gap-1.5">
                        {/* Category Field */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="categoryId"
                            className="text-xs font-medium"
                          >
                            Phân loại{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={form.watch("categoryId")}
                            onValueChange={(value) =>
                              form.setValue("categoryId", value)
                            }
                          >
                            <SelectTrigger
                              id="categoryId"
                              className={cn(
                                "w-full h-10 text-sm transition-all focus:ring-2 focus:ring-primary/20",
                                form.formState.errors.categoryId &&
                                  "border-destructive",
                              )}
                            >
                              <SelectValue placeholder="Chọn danh mục" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.length > 0 ? (
                                categories.map((cat) => (
                                  <SelectItem key={cat._id} value={cat._id}>
                                    {cat.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-xs text-center text-muted-foreground">
                                  Chưa có danh mục nào
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Unit Field */}
                        <div className="space-y-1.5">
                          <Label htmlFor="unit" className="text-xs font-medium">
                            Đơn vị tính{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={form.watch("unit")}
                            onValueChange={(value) =>
                              form.setValue("unit", value)
                            }
                          >
                            <SelectTrigger
                              id="unit"
                              className="w-full h-10 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                            >
                              <SelectValue placeholder="Chọn đơn vị" />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Status Field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="status" className="text-xs font-medium">
                          {isAggregatedEdit
                            ? "Trạng thái (Toàn cục - Ảnh hưởng tất cả chi nhánh)"
                            : showInventoryFields || !isEditMode
                              ? "Trạng thái (Chi nhánh)"
                              : "Trạng thái"}
                        </Label>
                        <Select
                          value={form.watch("status")}
                          onValueChange={(value: "active" | "inactive") =>
                            form.setValue("status", value)
                          }
                        >
                          <SelectTrigger
                            id="status"
                            className="w-full h-10 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                          >
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Đang bán</SelectItem>
                            <SelectItem value="inactive">Ngừng bán</SelectItem>
                          </SelectContent>
                        </Select>
                        {isAggregatedEdit && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            ⚠️ Thay đổi trạng thái toàn cục sẽ cập nhật trạng thái của sản phẩm này tại TẤT CẢ chi nhánh
                          </p>
                        )}
                        {showInventoryFields && (
                          <p className="text-xs text-muted-foreground">
                            Trạng thái này chỉ áp dụng cho chi nhánh đã chọn
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pricing & Description */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/50">
                      <div className="w-7 h-7 rounded bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                        <CircleDollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="font-bold text-sm">Giá bán & Mô tả</h3>
                    </div>

                    <div className="grid gap-4">
                      {/* List Price (currentSalePrice) */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="currentSalePrice"
                          className="text-xs font-medium"
                        >
                          {showInventoryFields && isEditMode
                            ? "Giá bán (Chi nhánh)"
                            : isAggregatedEdit
                              ? "Giá niêm yết (Chỉ xem)"
                              : "Giá niêm yết"}{" "}
                          (VNĐ) <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentSalePrice"
                            type="number"
                            min={0}
                            {...form.register("currentSalePrice")}
                            placeholder="0"
                            disabled={isAggregatedEdit}
                            className={cn(
                              "h-10 pl-3 pr-12 text-base font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                              form.formState.errors.currentSalePrice &&
                                "border-destructive focus:ring-destructive/20",
                              isAggregatedEdit && "opacity-60 cursor-not-allowed bg-muted",
                            )}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold pointer-events-none">
                            VNĐ
                          </div>
                        </div>
                        {isAggregatedEdit && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Giá bán riêng cho từng chi nhánh, không thể sửa ở chế độ xem tất cả
                          </p>
                        )}
                      </div>

                      {/* Import Price (Inventory Mode) */}
                      {showInventoryFields && (
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="importPrice"
                            className="text-xs font-medium"
                          >
                            Giá nhập (VNĐ)
                            <span className="ml-2 text-muted-foreground text-[10px]">
                              Tham khảo
                            </span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="importPrice"
                              type="number"
                              min={0}
                              {...form.register("importPrice")}
                              placeholder="0"
                              className="h-10 pl-3 pr-12 text-base font-medium text-orange-600 dark:text-orange-400 focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold pointer-events-none">
                              VNĐ
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="desc" className="text-xs font-medium">
                          Mô tả nhanh
                        </Label>
                        <Textarea
                          id="desc"
                          {...form.register("desc")}
                          placeholder="Mô tả ngắn về sản phẩm..."
                          rows={2}
                          className="resize-none h-20 text-sm focus:ring-2 focus:ring-primary/20 border-muted-foreground/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="sticky bottom-0 bg-background border-t py-3.5 px-6 flex items-center justify-between gap-3 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
              <div className="hidden sm:block text-[11px] text-muted-foreground italic">
                <span className="text-destructive">*</span> Trường bắt buộc
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="px-4 h-9 text-xs flex-1 sm:flex-initial"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="px-6 h-9 text-xs bg-primary hover:bg-primary/90 shadow shadow-primary/20 flex-1 sm:flex-initial gap-1.5"
                >
                  {isSubmitting || isUploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {isUploadingImage
                    ? "Đang tải ảnh..."
                    : isEditMode
                      ? "Lưu thay đổi"
                      : "Thêm sản phẩm"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
