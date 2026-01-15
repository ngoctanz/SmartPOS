"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, Lock, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdditionalBulkAction {
  label: string;
  icon: "trash" | "lock" | "printer";
  variant?: "default" | "destructive" | "outline";
  onClick: () => void;
}

interface BulkActionsProps {
  selectedCount: number;
  onAction?: () => void;
  onClearSelection: () => void;
  className?: string;
  actionLabel?: string;
  actionIcon?: "trash" | "lock" | "printer";
  additionalActions?: AdditionalBulkAction[];
}

export function BulkActions({
  selectedCount,
  onAction,
  onClearSelection,
  className,
  actionLabel = "Khóa đã chọn",
  actionIcon = "lock",
  additionalActions,
}: BulkActionsProps) {
  const getIcon = (icon: "trash" | "lock" | "printer") => {
    switch (icon) {
      case "lock":
        return Lock;
      case "printer":
        return Printer;
      case "trash":
        return Trash2;
    }
  };

  const ActionIcon = getIcon(actionIcon);
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

        {additionalActions?.map((action, index) => {
          const Icon = getIcon(action.icon);
          return (
            <Button
              key={index}
              variant={action.variant || "default"}
              size="sm"
              onClick={action.onClick}
            >
              <Icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          );
        })}

        <Button variant="outline" size="sm" onClick={onClearSelection}>
          <X className="mr-2 h-4 w-4" />
          Bỏ chọn
        </Button>
      </div>
    </div>
  );
}
