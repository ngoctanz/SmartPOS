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
// import { ScrollArea } from "@/components/ui/scroll-area"

import { cn } from "@/lib/utils";

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  footer?: React.ReactNode;
  className?: string;
}

export function DetailModal({
  open,
  onOpenChange,
  title,
  children,
  onEdit,
  footer,
  className,
}: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-h-[90vh] overflow-y-auto", className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{children}</div>
        {(onEdit || footer) && (
          <DialogFooter>
            {footer ? footer : <Button onClick={onEdit}>Chỉnh sửa</Button>}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
