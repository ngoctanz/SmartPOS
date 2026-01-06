"use client";

import * as React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { ProductSearchInput } from "@/components/common/product-search-input";
import { Product } from "@/service/product.service";
import { Branch } from "@/service/branch.service";
import {
  CreateImportReceiptRequest,
  ImportReceiptItem,
} from "@/service/import-receipt.service";

interface ImportReceiptFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  userBranchId?: string; // If user has assigned branch (non-admin)
  isAdmin: boolean;
  onSubmit: (data: CreateImportReceiptRequest) => Promise<void>;
  isSubmitting?: boolean;
}

interface SelectedProduct extends ImportReceiptItem {
  _id: string; // For key and tracking
}

export function ImportReceiptFormModal({
  open,
  onOpenChange,
  branches,
  userBranchId,
  isAdmin,
  onSubmit,
  isSubmitting = false,
}: ImportReceiptFormModalProps) {
  const [branchId, setBranchId] = React.useState<string>("");
  const [supplierName, setSupplierName] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [products, setProducts] = React.useState<SelectedProduct[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setBranchId(userBranchId || "");
      setSupplierName("");
      setNote("");
      setProducts([]);
      setErrors({});
    }
  }, [open, userBranchId]);

  // Calculate total amount
  const totalAmount = products.reduce((sum, p) => sum + p.subtotal, 0);

  // Get IDs of already selected products
  const selectedProductIds = products.map((p) => p.productId);

  // Handle product selection from search
  const handleProductSelect = (product: Product) => {
    const newProduct: SelectedProduct = {
      _id: product._id,
      productId: product._id,
      barcode: product.barcode || "",
      productName: product.name,
      quantity: 1,
      importPrice: 0,
      subtotal: 0,
    };
    setProducts((prev) => [...prev, newProduct]);

    // Clear product error if exists
    if (errors.products) {
      setErrors((prev) => {
        const { products: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle product field change
  const handleProductChange = (
    index: number,
    field: "quantity" | "importPrice",
    value: number
  ) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
        subtotal:
          field === "quantity"
            ? value * updated[index].importPrice
            : updated[index].quantity * value,
      };
      return updated;
    });
  };

  // Remove product from list
  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isAdmin && !branchId) {
      newErrors.branchId = "Vui lòng chọn chi nhánh";
    }

    if (products.length === 0) {
      newErrors.products = "Vui lòng thêm ít nhất 1 sản phẩm";
    }

    // Check each product
    products.forEach((p, i) => {
      if (p.quantity < 1) {
        newErrors[`product_${i}_quantity`] = "Số lượng phải >= 1";
      }
      if (p.importPrice < 0) {
        newErrors[`product_${i}_price`] = "Giá nhập không hợp lệ";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: CreateImportReceiptRequest = {
      branchId: isAdmin ? branchId : userBranchId || "",
      listProduct: products.map((p) => ({
        productId: p.productId,
        barcode: p.barcode,
        productName: p.productName,
        quantity: p.quantity,
        importPrice: p.importPrice,
        subtotal: p.subtotal,
      })),
      supplierName: supplierName || undefined,
      note: note || undefined,
    };

    await onSubmit(data);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo phiếu nhập hàng</DialogTitle>
          <DialogDescription>
            Nhập thông tin phiếu nhập và thêm các sản phẩm cần nhập
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Branch Selection - Only show for admin */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>
                  Chi nhánh <span className="text-destructive">*</span>
                </Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chi nhánh" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branchId && (
                  <p className="text-sm text-destructive">{errors.branchId}</p>
                )}
              </div>
            )}

            {/* Supplier Name */}
            <div className="space-y-2">
              <Label>Nhà cung cấp</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Tên nhà cung cấp (không bắt buộc)"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú cho phiếu nhập (không bắt buộc)"
              rows={2}
            />
          </div>

          {/* Product Search */}
          <div className="space-y-2">
            <Label>Tìm và thêm sản phẩm</Label>
            <ProductSearchInput
              onSelect={handleProductSelect}
              excludeIds={selectedProductIds}
              disabled={isSubmitting}
            />
            {errors.products && (
              <p className="text-sm text-destructive">{errors.products}</p>
            )}
          </div>

          {/* Selected Products Table */}
          {products.length > 0 && (
            <div className="space-y-2">
              <Label>Danh sách sản phẩm nhập ({products.length})</Label>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium">Sản phẩm</th>
                      <th className="p-2 text-left font-medium w-[100px]">
                        Barcode
                      </th>
                      <th className="p-2 text-right font-medium w-[100px]">
                        Số lượng
                      </th>
                      <th className="p-2 text-right font-medium w-[140px]">
                        Đơn giá nhập
                      </th>
                      <th className="p-2 text-right font-medium w-[120px]">
                        Thành tiền
                      </th>
                      <th className="p-2 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={product._id} className="border-t">
                        <td className="p-2">
                          <span className="font-medium">
                            {product.productName}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {product.barcode || "---"}
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={1}
                            value={product.quantity}
                            onChange={(e) =>
                              handleProductChange(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="h-8 w-full text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={product.importPrice}
                            onChange={(e) =>
                              handleProductChange(
                                index,
                                "importPrice",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 w-full text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(product.subtotal)}
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveProduct(index)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-medium">
                    <tr>
                      <td colSpan={4} className="p-2 text-right">
                        Tổng cộng:
                      </td>
                      <td className="p-2 text-right text-lg">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || products.length === 0}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Tạo phiếu nhập
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
