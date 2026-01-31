import * as React from "react";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { ImportReceiptItem } from "@/service/import-receipt.service";

interface ImportReceiptDetailMobileProps {
  products: ImportReceiptItem[];
  totalAmount: number;
}

export function ImportReceiptDetailMobile({ products, totalAmount }: ImportReceiptDetailMobileProps) {
  const [page, setPage] = React.useState(1);
  const pageSize = 5; // Fewer items per page on mobile
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedProducts = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, page]);

  return (
    <div className="space-y-3">
      {/* Product Cards */}
      {paginatedProducts.map((p, index) => (
        <div key={index} className="bg-card border rounded-lg p-3 space-y-2">
          {/* Product Name */}
          <div className="flex items-start gap-2">
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight">{p.productName}</p>
              {p.barcode && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {p.barcode}
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Số lượng</p>
              <p className="text-sm font-medium">{p.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đơn giá</p>
              <p className="text-sm font-medium">{formatCurrency(p.importPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thành tiền</p>
              <p className="text-sm font-semibold text-primary">
                {formatCurrency(p.subtotal)}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs bg-muted/30 rounded-lg p-2">
          <span className="text-muted-foreground">
            {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalItems)} / {totalItems}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              &lt;
            </Button>
            <div className="flex items-center justify-center min-w-[40px] text-xs font-medium">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              &gt;
            </Button>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex justify-between items-center">
        <span className="font-medium">Tổng cộng:</span>
        <span className="text-lg font-bold text-primary">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}
