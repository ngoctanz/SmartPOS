/**
 * Print Queue Status Component
 *
 * Component hiển thị trạng thái print queue
 * - Số job đang pending
 * - Job đang in
 * - Indicator khi đang xử lý
 *
 * @module PrintQueueStatus
 */

"use client";

import * as React from "react";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PrintJobStatus } from "@/utils/print-queue";

// === Types ===

export interface PrintQueueStatusProps {
  /** Queue đang xử lý */
  isProcessing: boolean;
  /** Số job đang pending */
  pendingCount: number;
  /** Mã receipt đang in */
  currentReceiptCode?: string;
  /** Class bổ sung */
  className?: string;
  /** Compact mode (chỉ icon) */
  compact?: boolean;
}

// === Helper ===

function getStatusIcon(status: PrintJobStatus) {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3 text-amber-500" />;
    case "printing":
      return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case "cancelled":
    case "error":
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

// === Component ===

export function PrintQueueStatus({
  isProcessing,
  pendingCount,
  currentReceiptCode,
  className,
  compact = false,
}: PrintQueueStatusProps) {
  // Không hiện gì khi idle
  if (!isProcessing && pendingCount === 0) {
    return null;
  }

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
        isProcessing
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "bg-amber-50 text-amber-700 border border-amber-200",
        className,
      )}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          {!compact && (
            <span>
              Đang in{currentReceiptCode ? `: ${currentReceiptCode}` : "..."}
            </span>
          )}
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          {!compact && <span>Chờ in: {pendingCount}</span>}
        </>
      )}

      {pendingCount > 0 && isProcessing && (
        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
          +{pendingCount}
        </Badge>
      )}
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom">
            {isProcessing ? (
              <p>
                Đang in: {currentReceiptCode || "..."}
                {pendingCount > 0 && ` (${pendingCount} đang chờ)`}
              </p>
            ) : (
              <p>{pendingCount} hóa đơn đang chờ in</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// === Extended Status Component ===

export interface PrintQueueStatusExtendedProps extends PrintQueueStatusProps {
  /** Danh sách jobs gần đây */
  recentJobs?: Array<{
    jobId: string;
    receiptCode: string;
    status: PrintJobStatus;
    createdAt: number;
  }>;
  /** Callback khi click vào job */
  onJobClick?: (receiptCode: string) => void;
}

export function PrintQueueStatusExtended({
  isProcessing,
  pendingCount,
  currentReceiptCode,
  recentJobs = [],
  onJobClick,
  className,
}: PrintQueueStatusExtendedProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Main status */}
      <PrintQueueStatus
        isProcessing={isProcessing}
        pendingCount={pendingCount}
        currentReceiptCode={currentReceiptCode}
      />

      {/* Recent jobs list */}
      {recentJobs.length > 0 && (
        <div className="text-xs space-y-1">
          <p className="text-muted-foreground font-medium">Gần đây:</p>
          {recentJobs.slice(0, 5).map((job) => (
            <div
              key={job.jobId}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded bg-muted/50",
                onJobClick && "cursor-pointer hover:bg-muted",
              )}
              onClick={() => onJobClick?.(job.receiptCode)}
            >
              {getStatusIcon(job.status)}
              <span className="font-mono">{job.receiptCode}</span>
              <span className="text-muted-foreground ml-auto">
                {new Date(job.createdAt).toLocaleTimeString("vi-VN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PrintQueueStatus;
