"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileEdit, Loader2, Package } from "lucide-react";
import { BranchProduct } from "@/service/stock.service";
import { useState, useEffect } from "react";

interface ProductEditPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: BranchProduct | null;
  onSave: (salePrice: number, minStock: number) => Promise<void>;
  isSubmitting: boolean;
}

export function ProductEditPriceModal({
  open,
  onOpenChange,
  product,
  onSave,
  isSubmitting,
}: ProductEditPriceModalProps) {
  const [salePriceValue, setSalePriceValue] = useState(0);
  const [minStockValue, setMinStockValue] = useState(0);

  useEffect(() => {
    if (product) {
      setSalePriceValue(product.salePrice || 0);
      setMinStockValue(product.minStock || 0);
    }
  }, [product]);

  const handleSave = async () => {
    await onSave(salePriceValue, minStockValue);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Chỉnh sửa thông tin
          </DialogTitle>
          <DialogDescription>
            Cập nhật giá bán và định mức tối thiểu cho sản phẩm
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {(product.productId?.images?.[0] || product.productId?.image) ? (
              <img
                src={product.productId?.images?.[0] || product.productId?.image}
                alt=""
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-background rounded flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{product.productId?.name}</p>
              <p className="text-sm text-muted-foreground">
                {product.productId?.barcode || "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Chi nhánh</Label>
              <Input
                value={product.branchId?.branchName || "—"}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Tồn kho hiện tại</Label>
              <Input
                value={product.stock}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="salePrice">Giá bán (VNĐ)</Label>
              <Input
                id="salePrice"
                type="number"
                min={0}
                placeholder="Nhập giá bán"
                value={salePriceValue}
                onChange={(e) => setSalePriceValue(Number(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minStock">Định mức tối thiểu</Label>
              <Input
                id="minStock"
                type="number"
                min={0}
                placeholder="Nhập định mức tối thiểu"
                value={minStockValue}
                onChange={(e) => setMinStockValue(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
