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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CheckCircle2, FileText, ChevronUp } from "lucide-react";
import { Branch } from "@/service/branch.service";
import { formatCurrency } from "@/utils/format.utils";
import { ImportItem } from "./import-items-table";

interface ImportSummaryMobileProps {
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

export function ImportSummaryMobile({
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
}: ImportSummaryMobileProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const totalAmount = items.reduce(
    (sum, item) => sum + item.importPrice * item.quantity,
    0
  );
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-40 safe-area-inset-bottom">
        <div className="p-3 space-y-2">
          {/* Summary Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">Sản phẩm: </span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">SL: </span>
                <span className="font-medium">{totalQuantity}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Tổng tiền</div>
              <div className="text-lg font-bold text-primary">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex-1 h-11"
                  disabled={items.length === 0}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Thông tin
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Thông tin phiếu nhập</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label className="text-sm">Chi nhánh *</Label>
                      <Select value={selectedBranch} onValueChange={onBranchChange}>
                        <SelectTrigger className="h-11">
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
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Ghi chú</Label>
                    <Textarea
                      value={note}
                      onChange={(e) => onNoteChange(e.target.value)}
                      placeholder="Ghi chú cho phiếu nhập..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Summary in sheet */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Số sản phẩm</span>
                      <span className="font-medium">{items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng số lượng</span>
                      <span className="font-medium">{totalQuantity}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Tổng tiền</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t bg-background">
                  <Button
                    className="w-full h-12"
                    size="lg"
                    onClick={() => {
                      setIsOpen(false);
                      setTimeout(onSubmit, 100);
                    }}
                    disabled={disabled}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Tạo phiếu nhập
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              className="flex-1 h-11"
              size="lg"
              disabled={disabled}
              onClick={onSubmit}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Tạo phiếu nhập
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed bar */}
      <div className="h-32" />
    </>
  );
}
