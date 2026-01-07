"use client";

import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useRef, ChangeEvent } from "react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  disabled,
  className
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    // Always use manual upload mode - just preview and pass file back
    const previewUrl = URL.createObjectURL(file);
    onChange(previewUrl);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleRemove = () => {
    onChange("");
    if (onFileSelect) {
      onFileSelect(null);
    }
    // Revoke object URL to free memory
    if (value && value.startsWith("blob:")) {
      URL.revokeObjectURL(value);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className={cn(
          "relative flex h-full w-full min-h-[200px] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted transition-colors hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Đang tải lên...
            </span>
          </div>
        ) : value ? (
          <>
            <img
              src={value}
              alt="Upload"
              className="h-full w-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-sm z-10"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center focus:outline-none"
          >
            <div className="rounded-full bg-background p-3 shadow-sm">
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Nhấn để tải ảnh lên
            </span>
            <span className="text-xs text-muted-foreground/70">
              (JPG, PNG, GIF - Max 5MB)
            </span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
