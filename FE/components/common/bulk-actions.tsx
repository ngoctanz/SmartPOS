"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, Lock, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsProps {
  selectedCount: number;
  onAction?: () => void;
  onClearSelection: () => void;
  className?: string;
  actionLabel?: string;
  actionIcon?: "trash" | "lock" | "printer";
}

export function BulkActions({
  selectedCount,
  onAction,
  onClearSelection,
  className,
  actionLabel = "Khóa đã chọn",
  actionIcon = "lock",
}: BulkActionsProps) {
  const ActionIcon =
    actionIcon === "lock" ? Lock : actionIcon === "printer" ? Printer : Trash2;
  const buttonVariant = actionIcon === "printer" ? "default" : "destructive";

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          {selectedCount}
        </div>
        <span className="text-sm font-medium text-foreground">
          mục được chọn
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onAction && (
          <Button variant={buttonVariant} size="sm" onClick={onAction}>
            <ActionIcon className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onClearSelection}>
          <X className="mr-2 h-4 w-4" />
          Bỏ chọn
        </Button>
      </div>
    </div>
  );
}
