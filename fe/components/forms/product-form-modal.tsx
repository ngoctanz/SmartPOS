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
import { ImageUpload } from "@/components/common/image-upload";
import {
  Package,
  CircleDollarSign,
  Layers,
  Info,
  PlusCircle,
  PencilLine,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Schema validation
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
  image: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  onSubmit: (
    data: CreateProductRequest | UpdateProductRequest
  ) => Promise<void>;
  isSubmitting?: boolean;
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
}: ProductFormModalProps) {
  const isEditMode = !!product;

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
      image: "",
    },
  });

  // Reset form when modal opens or product changes
  React.useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          name: product.name || "",
          barcode: product.barcode || "",
          categoryId: getCategoryId(product.categoryId),
          unit: product.unit || "cái",
          currentSalePrice: product.currentSalePrice || 0,
          status: product.status || "active",
          desc: product.desc || "",
          image: product.image || "",
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
          image: "",
        });
      }
    }
  }, [open, product, form]);

  const onFormSubmit = async (values: ProductFormData) => {
    // Clean up empty optional fields
    const cleanData = {
      ...values,
      barcode: values.barcode || undefined,
      desc: values.desc || undefined,
      image: values.image || undefined,
    };
    await onSubmit(cleanData);
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
              {isEditMode
                ? "Thực hiện các thay đổi cho thông tin sản phẩm của bạn tại đây."
                : "Điền các thông tin bên dưới để thêm một sản phẩm mới vào thực đơn."}
            </DialogDescription>
          </div>

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
                      Hình ảnh
                    </Label>
                    <div className="relative group rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-1.5 transition-all hover:border-primary/50 hover:bg-muted/50">
                      <ImageUpload
                        value={form.watch("image")}
                        onChange={(url) => form.setValue("image", url)}
                        disabled={isSubmitting}
                        className="w-full aspect-square rounded-lg overflow-hidden"
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-border/50">
                      <p className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[9px]">
                        <Info className="w-3 h-3" />
                        Gợi ý
                      </p>
                      <ul className="space-y-0.5 ml-1 opacity-80">
                        <li>• Ảnh vuông (tỷ lệ 1:1)</li>
                        <li>• Max 5MB (JPG, PNG)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right Column: Detailed Form */}
                <div className="space-y-6">
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
                              "border-destructive focus:ring-destructive/20"
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
                        <Label htmlFor="barcode" className="text-xs font-medium">
                          Mã vạch (Barcode)
                        </Label>
                        <Input
                          id="barcode"
                          {...form.register("barcode")}
                          placeholder="Quét hoặc nhập mã vạch sản phẩm..."
                          className={cn(
                            "h-10 text-sm font-mono transition-all focus:ring-2 focus:ring-primary/20",
                            form.formState.errors.barcode &&
                              "border-destructive focus:ring-destructive/20"
                          )}
                        />
                        {form.formState.errors.barcode && (
                          <p className="text-[11px] font-medium text-destructive mt-1 flex items-center gap-1">
                            <Info className="w-2.5 h-2.5" />
                            {form.formState.errors.barcode.message}
                          </p>
                        )}
                      </div>

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
                                  "border-destructive"
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
                          Trạng thái
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
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="currentSalePrice"
                          className="text-xs font-medium"
                        >
                          Giá niêm yết (VNĐ){" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentSalePrice"
                            type="number"
                            min={0}
                            {...form.register("currentSalePrice")}
                            placeholder="0"
                            className={cn(
                              "h-10 pl-3 pr-12 text-base font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                              form.formState.errors.currentSalePrice &&
                                "border-destructive focus:ring-destructive/20"
                            )}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold pointer-events-none">
                            VNĐ
                          </div>
                        </div>
                      </div>

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
                  disabled={isSubmitting}
                  className="px-6 h-9 text-xs bg-primary hover:bg-primary/90 shadow shadow-primary/20 flex-1 sm:flex-initial gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {isEditMode ? "Lưu thay đổi" : "Thêm sản phẩm"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
