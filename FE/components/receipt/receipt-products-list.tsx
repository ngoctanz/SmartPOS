import * as React from "react";
import { Package } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ReceiptProduct {
  productName: string;
  quantity: number;
  salePrice: number;
}

interface ReceiptProductsListProps {
  products: ReceiptProduct[];
}

export function ReceiptProductsList({ products }: ReceiptProductsListProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {products.map((p, index) => (
          <div key={index} className="bg-card border rounded-lg p-2">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs leading-tight">{p.productName}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {p.quantity} x {formatCurrency(p.salePrice)}
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {formatCurrency(p.salePrice * p.quantity)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-md max-h-[200px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted sticky top-0">
          <tr>
            <th className="p-2 text-left font-medium">Sản phẩm</th>
            <th className="p-2 text-center font-medium">SL</th>
            <th className="p-2 text-right font-medium">Đơn giá</th>
            <th className="p-2 text-right font-medium">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, index) => (
            <tr key={index} className="border-b last:border-0">
              <td className="p-2">{p.productName}</td>
              <td className="p-2 text-center">{p.quantity}</td>
              <td className="p-2 text-right">{formatCurrency(p.salePrice)}</td>
              <td className="p-2 text-right font-medium">
                {formatCurrency(p.salePrice * p.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
