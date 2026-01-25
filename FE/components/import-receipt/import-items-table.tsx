"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Package } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";

export interface ImportItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  importPrice: number;
  unit: string;
  image?: string;
  isImportPriceManual?: boolean; // Track if user manually entered the price
}

interface ImportItemsTableProps {
  items: ImportItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  onClearAll: () => void;
}

export function ImportItemsTable({
  items,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  onClearAll,
}: ImportItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
        <Package className="h-12 w-12 mb-3 opacity-50" />
        <p className="font-medium">Chưa có sản phẩm nào</p>
        <p className="text-sm">Quét barcode hoặc tìm kiếm để thêm sản phẩm</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {items.length} sản phẩm
        </span>
        <Button variant="ghost" size="sm" onClick={onClearAll} className="text-destructive hover:text-destructive h-8">
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Xóa tất cả
        </Button>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg bg-background">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left p-3 font-medium">Sản phẩm</th>
              <th className="text-center p-3 font-medium w-24">SL</th>
              <th className="text-right p-3 font-medium w-32">Giá nhập</th>
              <th className="text-right p-3 font-medium w-28">Thành tiền</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.productId} className="hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.barcode || "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.productId, parseInt(e.target.value) || 1)}
                    className="w-20 text-center h-9 mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    min="0"
                    value={item.isImportPriceManual ? item.importPrice || "" : ""}
                    placeholder={
                      !item.isImportPriceManual && item.importPrice > 0
                        ? item.importPrice.toString()
                        : "0"
                    }
                    onChange={(e) => onUpdatePrice(item.productId, parseFloat(e.target.value) || 0)}
                    className="w-28 text-right h-9 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/60"
                  />
                </td>
                <td className="p-3 text-right font-medium">
                  <span
                    className={
                      !item.isImportPriceManual && item.importPrice > 0
                        ? "text-muted-foreground/60"
                        : ""
                    }
                  >
                    {formatCurrency(item.importPrice * item.quantity)}
                  </span>
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
