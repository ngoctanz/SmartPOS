"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Package, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";
import { ImportItem } from "./import-items-table";

interface ImportItemsMobileProps {
  items: ImportItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  onClearAll: () => void;
}

export function ImportItemsMobile({
  items,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  onClearAll,
}: ImportItemsMobileProps) {
  const [editingPriceId, setEditingPriceId] = React.useState<string | null>(null);
  const priceInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingPriceId && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPriceId]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
        <Package className="h-12 w-12 mb-3 opacity-50" />
        <p className="font-medium">Chưa có sản phẩm nào</p>
        <p className="text-sm text-center px-4">Quét barcode hoặc tìm kiếm để thêm sản phẩm</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-medium text-muted-foreground">
          {items.length} sản phẩm
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearAll} 
          className="text-destructive hover:text-destructive h-8 -mr-2"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Xóa tất cả
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-3 pb-2">
        {items.map((item) => {
          const isEditingPrice = editingPriceId === item.productId;
          const totalPrice = item.importPrice * item.quantity;

          return (
            <div 
              key={item.productId} 
              className="bg-card border rounded-lg p-3 shadow-sm"
            >
              {/* Product Info */}
              <div className="flex gap-3 mb-3">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt="" 
                    className="w-16 h-16 rounded object-cover flex-shrink-0" 
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight mb-1">{item.productName}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.barcode || "—"} • {item.unit}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Thành tiền:</span>
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => onRemove(item.productId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quantity & Price Controls */}
              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Số lượng</label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        onUpdateQuantity(item.productId, val);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="h-9 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Import Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Giá nhập</label>
                  {isEditingPrice ? (
                    <Input
                      ref={priceInputRef}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1000"
                      value={item.importPrice || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onUpdatePrice(item.productId, val);
                      }}
                      onBlur={() => setEditingPriceId(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setEditingPriceId(null);
                        }
                      }}
                      className="h-9 text-right font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingPriceId(item.productId)}
                      className="w-full h-9 px-3 text-right font-medium border rounded-md bg-background hover:bg-accent transition-colors"
                    >
                      {item.importPrice > 0 ? (
                        <span className={!item.isImportPriceManual ? "text-muted-foreground/70" : ""}>
                          {formatCurrency(item.importPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">Nhập giá</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
