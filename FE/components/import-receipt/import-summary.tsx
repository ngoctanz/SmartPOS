"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import { Branch } from "@/service/branch.service";
import { formatCurrency } from "@/utils/format.utils";
import { ImportItem } from "./import-items-table";

interface ImportSummaryProps {
  items: ImportItem[];
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  supplierName: string;
  onSupplierChange: (name: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
  isAdmin: boolean;
  onSubmit: () => void;
  disabled: boolean;
}

export function ImportSummary({
  items,
  branches,
  selectedBranch,
  onBranchChange,
  supplierName,
  onSupplierChange,
  note,
  onNoteChange,
  isAdmin,
  onSubmit,
  disabled,
}: ImportSummaryProps) {
  const totalAmount = items.reduce(
    (sum, item) => sum + item.importPrice * item.quantity,
    0
  );
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="w-80 flex flex-col bg-card border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold">Thông tin phiếu nhập</h2>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4 flex-1 overflow-auto">
        {isAdmin && (
          <div className="space-y-2">
            <Label className="text-sm">Chi nhánh</Label>
            <Select value={selectedBranch} onValueChange={onBranchChange}>
              <SelectTrigger className="h-10">
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
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm">Nhà cung cấp</Label>
          <Input
            value={supplierName}
            onChange={(e) => onSupplierChange(e.target.value)}
            placeholder="Nhập tên nhà cung cấp"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Ghi chú</Label>
          <Textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Ghi chú cho phiếu nhập..."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 border-t bg-muted/30">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Số sản phẩm</span>
            <span>{items.length}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tổng số lượng</span>
            <span>{totalQuantity}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between items-center">
            <span className="font-medium">Tổng tiền</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        <Button
          className="w-full mt-4 h-11"
          size="lg"
          disabled={disabled}
          onClick={onSubmit}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Tạo phiếu nhập
        </Button>
      </div>
    </div>
  );
}
