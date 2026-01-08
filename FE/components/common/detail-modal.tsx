"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

import { cn } from "@/lib/utils";

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

export function DetailModal({
  open,
  onOpenChange,
  title,
  children,
  onEdit,
  footer,
  className,
  maxWidth = "lg",
}: DetailModalProps) {
  const maxWidthClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
  }[maxWidth];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-h-[90vh] overflow-y-auto", maxWidthClass, className)}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{children}</div>
        {(onEdit || footer) && (
          <DialogFooter className="pt-4 border-t">
            {footer ? (
              footer
            ) : (
              <Button onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
