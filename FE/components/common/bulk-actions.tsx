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
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 rounded-xl border-2 border-primary/20 bg-primary/5 px-3 sm:px-4 py-2 sm:py-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold">
          {selectedCount}
        </div>
        <span className="text-xs sm:text-sm font-medium text-foreground">
          mục được chọn
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {onAction && (
          <Button 
            variant={buttonVariant} 
            size="sm" 
            onClick={onAction}
            className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
          >
            <ActionIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{actionLabel}</span>
            <span className="sm:hidden">
              {actionIcon === "printer" ? "In" : actionIcon === "trash" ? "Xóa" : "Khóa"}
            </span>
          </Button>
        )}

        {additionalActions?.map((action, index) => {
          const Icon = getIcon(action.icon);
          const shortLabel = action.icon === "printer" ? "In" : action.icon === "trash" ? "Xóa" : "Khóa";
          
          return (
            <Button
              key={index}
              variant={action.variant || "default"}
              size="sm"
              onClick={action.onClick}
              className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
            >
              <Icon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </Button>
          );
        })}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClearSelection}
          className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
        >
          <X className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Bỏ chọn</span>
          <span className="sm:hidden">Bỏ</span>
        </Button>
      </div>
    </div>
  );
}
