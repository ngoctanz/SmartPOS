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
import { MoreHorizontal, Edit, Trash2, Eye, Lock, Unlock } from "lucide-react";

interface RowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onAction?: () => void;
  /** @deprecated Use onAction instead */
  onDelete?: () => void;
  actionLabel?: string;
  actionIcon?: "trash" | "lock" | "unlock";
}

export function RowActions({
  onView,
  onEdit,
  onAction,
  onDelete,
  actionLabel = "Xóa",
  actionIcon = "trash",
}: RowActionsProps) {
  // Support both onAction and onDelete (backward compatibility)
  const handleAction = onAction || onDelete;
  const ActionIcon =
    actionIcon === "lock" ? Lock : actionIcon === "unlock" ? Unlock : Trash2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
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
            Chỉnh sửa
          </DropdownMenuItem>
        )}
        {handleAction && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleAction}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
            >
              <ActionIcon className="mr-2 h-4 w-4" />
              {actionLabel}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
