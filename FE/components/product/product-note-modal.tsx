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
import { Textarea } from "@/components/ui/textarea";
import { FileEdit, Loader2, Package } from "lucide-react";
import { BranchProduct } from "@/service/stock.service";
import { useState, useEffect } from "react";

interface ProductNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: BranchProduct | null;
  onSave: (note: string) => Promise<void>;
  isSubmitting: boolean;
}

export function ProductNoteModal({
  open,
  onOpenChange,
  product,
  onSave,
  isSubmitting,
}: ProductNoteModalProps) {
  const [noteValue, setNoteValue] = useState("");

  useEffect(() => {
    if (product) {
      setNoteValue(product.note || "");
    }
  }, [product]);

  const handleSave = async () => {
    await onSave(noteValue);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Cập nhật ghi chú
          </DialogTitle>
          <DialogDescription>
            Thêm hoặc chỉnh sửa ghi chú cho sản phẩm trong kho
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

          <div className="grid gap-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Nhập ghi chú về sản phẩm (vd: Sản phẩm bị hư hộp, cần kiểm tra...)"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              rows={4}
              className="resize-none"
            />
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
              "Lưu ghi chú"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
