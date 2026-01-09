"use client";

import * as React from "react";
import { X, Plus, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MultipleImageUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function MultipleImageUpload({
  value = [],
  onChange,
  onFilesSelect,
  disabled = false,
  className,
}: MultipleImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>(value);

  React.useEffect(() => {
    setPreviewUrls(value);
  }, [value]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Create preview URLs for new files
    const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
    const updatedUrls = [...previewUrls, ...newPreviewUrls];
    
    setPreviewUrls(updatedUrls);
    onChange(updatedUrls);
    onFilesSelect(files);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    const urlToRemove = previewUrls[index];
    
    // Revoke blob URL if it's a local preview
    if (urlToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(urlToRemove);
    }

    const updatedUrls = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(updatedUrls);
    onChange(updatedUrls);
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />

      {/* Image Grid */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {previewUrls.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border-2 border-muted bg-muted"
            >
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemoveImage(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                  Chính
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {previewUrls.length === 0 && (
        <div
          onClick={handleAddClick}
          className={cn(
            "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30",
            "flex flex-col items-center justify-center gap-3 cursor-pointer",
            "hover:border-primary/50 hover:bg-muted/50 transition-all",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="rounded-full bg-primary/10 p-4">
            <ImageIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Tải ảnh lên</p>
            <p className="text-xs text-muted-foreground mt-1">
              Chọn nhiều ảnh cùng lúc
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      {previewUrls.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {previewUrls.length} ảnh đã chọn
        </p>
      )}
    </div>
  );
}
