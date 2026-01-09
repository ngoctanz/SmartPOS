"use client";

import * as React from "react";
import { X, Plus, Image as ImageIcon, GripVertical } from "lucide-react";
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
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newUrls = [...previewUrls];
    const draggedUrl = newUrls[draggedIndex];
    newUrls.splice(draggedIndex, 1);
    newUrls.splice(index, 0, draggedUrl);

    setPreviewUrls(newUrls);
    onChange(newUrls);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
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
              key={`${url}-${index}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative group aspect-square rounded-lg overflow-hidden border-2 border-muted bg-muted",
                !disabled && "cursor-move",
                draggedIndex === index && "opacity-50"
              )}
            >
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Drag Handle */}
              {!disabled && (
                <div className="absolute top-1 right-1 bg-black/50 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-3 w-3 text-white" />
                </div>
              )}
              
              {/* Remove Button */}
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
              
              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Chính
                </div>
              )}
            </div>
          ))}
          
          {/* Add More Button */}
          <button
            type="button"
            onClick={handleAddClick}
            disabled={disabled}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30",
              "flex flex-col items-center justify-center gap-2 cursor-pointer",
              "hover:border-primary/50 hover:bg-primary/5 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="rounded-full bg-primary/10 p-3">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Thêm ảnh
            </p>
          </button>
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
          {previewUrls.length} ảnh • Kéo thả để sắp xếp
        </p>
      )}
    </div>
  );
}
