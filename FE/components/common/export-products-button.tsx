"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, Loader2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import exportService from "@/service/export.service";

interface ExportProductsButtonProps {
  filters?: {
    categoryId?: string;
    status?: string;
    search?: string;
  };
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportProductsButton({
  filters,
  variant = "outline",
  size = "default",
}: ExportProductsButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async (type: "all" | "filtered" | "by-category") => {
    try {
      setIsExporting(true);
      
      let blob: Blob;
      let filename: string;

      switch (type) {
        case "all":
          toast.info("Đang export tất cả sản phẩm...");
          blob = await exportService.exportProducts();
          filename = `tat-ca-san-pham-${Date.now()}.xlsx`;
          break;
          
        case "filtered":
          toast.info("Đang export sản phẩm đã lọc...");
          blob = await exportService.exportProducts(filters);
          filename = `san-pham-da-loc-${Date.now()}.xlsx`;
          break;
          
        case "by-category":
          toast.info("Đang export theo danh mục...");
          blob = await exportService.exportByCategory();
          filename = `san-pham-theo-danh-muc-${Date.now()}.xlsx`;
          break;
          
        default:
          throw new Error("Invalid export type");
      }

      exportService.downloadBlob(blob, filename);
      toast.success("Export thành công!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Lỗi khi export sản phẩm");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsExporting(true);
      toast.info("Đang tải template...");
      
      const blob = await exportService.downloadTemplate();
      exportService.downloadBlob(blob, "mau-import-san-pham.xlsx");
      
      toast.success("Tải template thành công!");
    } catch (error: any) {
      console.error("Download template error:", error);
      toast.error(error.message || "Lỗi khi tải template");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export sản phẩm</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleExport("all")} disabled={isExporting}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Tất cả sản phẩm</span>
        </DropdownMenuItem>
        
        {filters && (
          <DropdownMenuItem onClick={() => handleExport("filtered")} disabled={isExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <span>Sản phẩm đã lọc</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={() => handleExport("by-category")} disabled={isExporting}>
          <FolderTree className="mr-2 h-4 w-4" />
          <span>Theo danh mục</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleDownloadTemplate} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          <span>Tải template import</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
