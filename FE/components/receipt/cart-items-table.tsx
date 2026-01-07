"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/utils/format.utils";

export interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  salePrice: number;
  unit: string;
  image?: string;
}

interface CartItemsTableProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClearAll: () => void;
}

export function CartItemsTable({
  items,
  onUpdateQuantity,
  onRemove,
  onClearAll,
}: CartItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border rounded-lg bg-muted/30">
        <ShoppingCart className="h-12 w-12 mb-3" />
        <p className="font-medium">Giỏ hàng trống</p>
        <p className="text-sm">Quét barcode hoặc tìm kiếm để thêm sản phẩm</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <span className="font-medium text-sm">
          Giỏ hàng ({items.length} sản phẩm)
        </span>
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Xóa tất cả
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">STT</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right w-28">Đơn giá</TableHead>
              <TableHead className="text-center w-36">Số lượng</TableHead>
              <TableHead className="text-right w-32">Thành tiền</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.productId}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.barcode || "—"} • {item.unit}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.salePrice)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(item.productId, parseInt(e.target.value) || 1)
                      }
                      className="w-14 text-center h-7 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(item.salePrice * item.quantity)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemove(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
