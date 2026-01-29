"use client";

import { DetailModal } from "@/components/common/detail-modal";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { BranchProduct } from "@/service/stock.service";

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: BranchProduct | null;
}

export function ProductDetailModal({
  open,
  onOpenChange,
  product,
}: ProductDetailModalProps) {
  if (!product) return null;

  return (
    <DetailModal
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết sản phẩm"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Header với ảnh đại diện và trạng thái */}
        <div className="flex items-start gap-4 pb-4 border-b">
          {(product.productId?.images?.[0] || product.productId?.image) ? (
            <img
              src={product.productId?.images?.[0] || product.productId?.image}
              alt=""
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold mb-1">{product.productId?.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">
              {product.productId?.barcode || "Không có mã vạch"}
            </p>
          </div>
          {product.stock <= 0 ? (
            <Badge variant="destructive" className="gap-1 flex-shrink-0">
              <AlertTriangle className="h-3 w-3" />
              Hết hàng
            </Badge>
          ) : product.stock <= product.minStock ? (
            <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 flex-shrink-0">
              <AlertTriangle className="h-3 w-3" />
              Sắp hết
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
              Còn hàng
            </Badge>
          )}
        </div>

        {/* Hình ảnh sản phẩm */}
        {(() => {
          const images = product.productId?.images || [];
          const singleImage = product.productId?.image;
          
          // Tạo mảng ảnh: ưu tiên images array, fallback sang image field
          const allImages = images.length > 0 
            ? images 
            : singleImage 
              ? [singleImage] 
              : [];
          
          if (allImages.length === 0) return null;
          
          return (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Hình ảnh sản phẩm ({allImages.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allImages.map((img: string, idx: number) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                    <img
                      src={img}
                      alt={`${product.productId?.name} - ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Mô tả sản phẩm */}
        {product.productId?.desc && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Mô tả</h4>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{product.productId.desc}</p>
            </div>
          </div>
        )}

        {/* Thông tin chi tiết */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Thông tin chi tiết</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!product.isAggregated && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chi nhánh</p>
                <p className="font-medium">{product.branchId?.branchName || "—"}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Loại sản phẩm</p>
              <p className="font-medium">
                {typeof product.productId?.categoryId === "object" && product.productId?.categoryId?.name
                  ? product.productId.categoryId.name
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Đơn vị</p>
              <p className="font-medium">{product.productId?.unit || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Mã vạch</p>
              <p className="font-medium font-mono">{product.productId?.barcode || "—"}</p>
            </div>
            {!product.isAggregated && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Mã hàng</p>
                <p className="font-medium font-mono">{product.productCode || "—"}</p>
              </div>
            )}
            {product.isAggregated && product.branchCount && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Số chi nhánh</p>
                <p className="font-medium">{product.branchCount} chi nhánh</p>
              </div>
            )}
            {!product.isAggregated && (
              <>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Giá bán</p>
                  <p className="font-medium text-primary text-lg">{formatCurrency(product.salePrice || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Giá nhập gần nhất</p>
                  <p className="font-medium text-muted-foreground">
                    {product.lastImportPrice ? formatCurrency(product.lastImportPrice) : "—"}
                  </p>
                </div>
              </>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{product.isAggregated ? "Tổng tồn kho" : "Tồn kho hiện tại"}</p>
              <p className="text-2xl font-bold text-primary">{product.stock}</p>
            </div>
            {!product.isAggregated && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Định mức tối thiểu</p>
                <p className="font-medium">{product.minStock}</p>
              </div>
            )}
          </div>
        </div>

        {/* Ghi chú */}
        {!product.isAggregated && product.note && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Ghi chú</h4>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{product.note}</p>
            </div>
          </div>
        )}
      </div>
    </DetailModal>
  );
}
