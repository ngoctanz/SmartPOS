import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format.utils";
import Barcode from "react-barcode";
import { ImportReceiptItem } from "@/service/import-receipt.service";

interface ImportReceiptDetailTableProps {
  products: ImportReceiptItem[];
  totalAmount: number;
}

export function ImportReceiptDetailTable({ products, totalAmount }: ImportReceiptDetailTableProps) {
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedProducts = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, page]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-3 text-left font-medium min-w-[140px]">Mã vạch</th>
            <th className="p-3 text-left font-medium">Tên sản phẩm</th>
            <th className="p-3 text-right font-medium">SL</th>
            <th className="p-3 text-right font-medium">Đơn giá</th>
            <th className="p-3 text-right font-medium">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {paginatedProducts.map((p, index) => (
            <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
              <td className="p-3 py-4">
                {p.barcode ? (
                  <div className="max-w-[120px]">
                    <Barcode 
                      value={p.barcode}
                      width={1}
                      height={30}
                      fontSize={11}
                      displayValue={true}
                      margin={0}
                      background="transparent"
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground">---</span>
                )}
              </td>
              <td className="p-3 py-4 align-middle">{p.productName}</td>
              <td className="p-3 py-4 text-right align-middle">{p.quantity}</td>
              <td className="p-3 py-4 text-right align-middle">
                {formatCurrency(p.importPrice)}
              </td>
              <td className="p-3 py-4 text-right font-medium align-middle">
                {formatCurrency(p.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted/20">
          {totalPages > 1 && (
            <tr>
              <td colSpan={5} className="p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalItems)} trong {totalItems} sản phẩm
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
                    <div className="flex items-center justify-center min-w-[30px]">
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
              </td>
            </tr>
          )}
        </tfoot>
      </table>
      <div className="bg-muted/50 p-3 flex justify-end items-center gap-4 border-t">
        <span className="font-medium">Tổng cộng:</span>
        <span className="text-lg font-bold text-primary">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}
