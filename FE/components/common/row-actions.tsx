"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Lock,
  Unlock,
  Check,
  X,
} from "lucide-react";

interface CustomAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface RowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onAction?: () => void;
  onDelete?: () => void;
  actionLabel?: string;
  actionIcon?: "trash" | "lock" | "unlock" | "check" | "cancel";
  editLabel?: string;
  disabled?: boolean;
  customActions?: CustomAction[];
}

// Icon mapping outside component to avoid creating during render
const ACTION_ICONS = {
  trash: Trash2,
  lock: Lock,
  unlock: Unlock,
  check: Check,
  cancel: X,
} as const;

export function RowActions({
  onView,
  onEdit,
  onAction,
  onDelete,
  actionLabel = "Xóa",
  actionIcon = "trash",
  editLabel = "Chỉnh sửa",
  disabled = false,
  customActions = [],
}: RowActionsProps) {
  const ActionIcon = ACTION_ICONS[actionIcon];
  const isDestructive = actionIcon === "trash" || actionIcon === "cancel";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={disabled}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            Xem chi tiết
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            {editLabel}
          </DropdownMenuItem>
        )}
        {customActions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onClick={action.onClick}
            className={
              action.variant === "destructive"
                ? "text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                : ""
            }
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </DropdownMenuItem>
        ))}
        {onAction && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onAction}
              className={
                isDestructive
                  ? "text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                  : "text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950/50"
              }
            >
              <ActionIcon className="mr-2 h-4 w-4" />
              {actionLabel}
            </DropdownMenuItem>
          </>
        )}
        {onDelete && (
          <>
            {!onAction && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
