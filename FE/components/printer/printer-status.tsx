/**
 * Printer Status Indicator
 *
 * Component hiển thị trạng thái máy in
 * - Badge cho biết đã setup hay chưa
 * - Nút reset để cấu hình lại
 *
 * @module PrinterStatus
 */

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, Settings, RotateCcw, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// === Types ===

export interface PrinterStatusProps {
  /** Máy in đã sẵn sàng (đã setup) */
  isReady: boolean;
  /** Đang in */
  isPrinting?: boolean;
  /** Callback khi bấm reset */
  onReset?: () => void;
  /** Callback khi bấm test print */
  onTestPrint?: () => void;
  /** Hiển thị dạng compact (chỉ icon) */
  compact?: boolean;
  /** Class bổ sung */
  className?: string;
}

// === Component ===

export function PrinterStatus({
  isReady,
  isPrinting = false,
  onReset,
  onTestPrint,
  compact = false,
  className,
}: PrinterStatusProps) {
  const statusColor = isReady ? "text-green-600" : "text-amber-500";
  const statusBg = isReady
    ? "bg-green-50 border-green-200"
    : "bg-amber-50 border-amber-200";
  const statusText = isReady ? "Đã cấu hình" : "Chưa cấu hình";

  // Compact mode: Chỉ hiện icon với tooltip
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("relative", className)}
                  disabled={isPrinting}
                >
                  <Printer className={cn("h-4 w-4", statusColor)} />
                  {/* Status dot */}
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                      isReady ? "bg-green-500" : "bg-amber-500",
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium flex items-center gap-2">
                  {isReady ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  Máy in: {statusText}
                </div>
                <DropdownMenuSeparator />
                {onTestPrint && (
                  <DropdownMenuItem onClick={onTestPrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    In thử
                  </DropdownMenuItem>
                )}
                {onReset && (
                  <DropdownMenuItem onClick={onReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Cấu hình lại máy in
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Máy in: {statusText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode: Badge với dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 border", statusBg, className)}
          disabled={isPrinting}
        >
          <Printer className={cn("h-4 w-4", statusColor)} />
          <span className={cn("text-sm", statusColor)}>{statusText}</span>
          <Settings className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          {isReady
            ? "Máy in đã được cấu hình. Hóa đơn sẽ được in trực tiếp."
            : "Chưa cấu hình máy in. Lần in đầu tiên sẽ hiện hộp thoại chọn máy in."}
        </div>
        <DropdownMenuSeparator />
        {onTestPrint && (
          <DropdownMenuItem onClick={onTestPrint}>
            <Printer className="h-4 w-4 mr-2" />
            In thử
          </DropdownMenuItem>
        )}
        {onReset && (
          <DropdownMenuItem onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Cấu hình lại máy in
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PrinterStatus;
