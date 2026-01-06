"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsProps {
  selectedCount: number;
  onAction?: () => void;
  onClearSelection: () => void;
  className?: string;
  actionLabel?: string;
  actionIcon?: "trash" | "lock";
}

export function BulkActions({
  selectedCount,
  onAction,
  onClearSelection,
  className,
  actionLabel = "Khóa đã chọn",
  actionIcon = "lock",
}: BulkActionsProps) {
  const ActionIcon = actionIcon === "lock" ? Lock : Trash2;
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2",
        className
      )}
    >
      <span className="text-sm font-medium">
        Đã chọn <strong>{selectedCount}</strong> mục
      </span>

      <div className="flex items-center gap-2">
        {onAction && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onAction}
            className="h-8"
          >
            <ActionIcon className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8"
        >
          <X className="mr-2 h-4 w-4" />
          Bỏ chọn
        </Button>
      </div>
    </div>
  );
}
