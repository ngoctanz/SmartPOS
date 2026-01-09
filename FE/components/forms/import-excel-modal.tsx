"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  X,
} from "lucide-react";
import importService, {
  ImportPreviewResult,
  ImportResult,
} from "@/service/import.service";
import { formatCurrency } from "@/utils/format.utils";

// Updated to support new ImportResult structure with parsed, skipped fields

interface ImportExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportExcelModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportExcelModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ImportPreviewResult | null>(null);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState<string>("");
  const [step, setStep] = React.useState<"upload" | "preview" | "importing" | "result">("upload");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setImportProgress("");
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV");
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setImportResult(null);

    // Auto preview
    try {
      setIsLoading(true);
      const result = await importService.previewExcel(selectedFile);
      setPreview(result);
      setStep("preview");
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error.message || "Lỗi khi preview file");
      handleReset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    try {
      setIsLoading(true);
      setStep("importing");
      setImportProgress(`Đang import ${preview.total} sản phẩm...`);
      
      const result = await importService.importProducts(file);
      setImportResult(result);
      setStep("result");

      if (result.failed === 0) {
        toast.success(
          `Import thành công ${result.created} sản phẩm mới, cập nhật ${result.updated} sản phẩm`
        );
      } else {
        toast.warning(
          `Import hoàn tất với ${result.failed} lỗi. Vui lòng xem chi tiết.`
        );
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Lỗi khi import sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create sample Excel data
    const sampleData = [
      {
        "Nhóm hàng": "Điện thoại",
        "Mã vạch": "8934567890123",
        "Tên hàng": "iPhone 15 Pro Max",
        "Giá bán": "29990000",
        "Hình ảnh": "https://example.com/image1.jpg,https://example.com/image2.jpg",
      },
      {
        "Nhóm hàng": "Laptop",
        "Mã vạch": "8934567890124",
        "Tên hàng": "MacBook Pro M3",
        "Giá bán": "45990000",
        "Hình ảnh": "https://example.com/macbook.jpg",
      },
    ];

    // Convert to CSV
    const headers = Object.keys(sampleData[0]);
    const csv = [
      headers.join(","),
      ...sampleData.map((row) =>
        headers.map((header) => `"${row[header as keyof typeof row]}"`).join(",")
      ),
    ].join("\n");

    // Download
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mau_import_san_pham.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-800" />
            Import sản phẩm từ Excel
          </DialogTitle>
          <DialogDescription>
            Tải lên file Excel để import hàng loạt sản phẩm vào hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="file-upload">Chọn file Excel</Label>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nhấn để chọn file</p>
                    <p className="text-sm text-muted-foreground">
                      Hỗ trợ: .xlsx, .xls, .csv
                    </p>
                  </div>
                </label>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Lưu ý:</strong> File Excel cần có các cột:{" "}
                  <strong>Nhóm hàng</strong>, <strong>Mã vạch</strong>,{" "}
                  <strong>Tên hàng</strong>, <strong>Giá bán</strong>,{" "}
                  <strong>Hình ảnh</strong> (URL, ngăn cách bằng dấu phẩy)
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Xem trước dữ liệu</h3>
                  <p className="text-sm text-muted-foreground">
                    Tổng: {preview.total} sản phẩm
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  <X className="mr-2 h-4 w-4" />
                  Chọn file khác
                </Button>
              </div>

              {/* Categories */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Loại sản phẩm ({preview.categories.length})
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {preview.categories.map((cat, idx) => (
                    <Badge key={idx} variant="secondary">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Validation Errors */}
              {preview.validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Lỗi validation:</strong>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {preview.validationErrors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {preview.validationErrors.length > 5 && (
                        <li>...và {preview.validationErrors.length - 5} lỗi khác</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Mã vạch</TableHead>
                      <TableHead>Tên sản phẩm</TableHead>
                      <TableHead>Giá bán</TableHead>
                      <TableHead>Hình ảnh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.categoryName}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.barcode || "---"}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-xs">
                          {item.images.length > 0 ? (
                            <Badge variant="secondary">{item.images.length} ảnh</Badge>
                          ) : (
                            "---"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {preview.total > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Hiển thị 10/{preview.total} sản phẩm đầu tiên
                </p>
              )}
            </div>
          )}

          {/* Step 2.5: Importing */}
          {step === "importing" && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold mb-2">Đang import sản phẩm...</h3>
                <p className="text-muted-foreground">{importProgress}</p>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Lưu ý:</strong> Quá trình import có thể mất vài phút với file lớn. 
                  Vui lòng không đóng cửa sổ này.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 3: Result */}
          {step === "result" && importResult && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Import hoàn tất!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Đã xử lý {importResult.total} dòng từ file Excel
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border rounded-lg p-4 text-center bg-muted/30">
                  <p className="text-2xl font-bold text-foreground">
                    {importResult.total}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Tổng dòng</p>
                </div>
                <div className="border rounded-lg p-4 text-center bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.created}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">Tạo mới</p>
                </div>
                <div className="border rounded-lg p-4 text-center bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importResult.updated}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Cập nhật</p>
                </div>
                <div className="border rounded-lg p-4 text-center bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importResult.failed + (importResult.skipped || 0)}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">Lỗi</p>
                </div>
              </div>

              {/* Additional Info */}
              {(importResult.parsed !== importResult.total || (importResult.skipped && importResult.skipped > 0)) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {importResult.parsed !== importResult.total && (
                      <p>• {importResult.total - importResult.parsed} dòng không parse được (dòng trống hoặc lỗi format)</p>
                    )}
                    {importResult.skipped && importResult.skipped > 0 && (
                      <p>• {importResult.skipped} sản phẩm bị bỏ qua (không tìm thấy category hoặc lỗi khác)</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Summary */}
              {importResult.failed === 0 && (importResult.skipped || 0) === 0 && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Thành công!</strong> Tất cả sản phẩm đã được import vào hệ thống.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Details */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Chi tiết lỗi ({importResult.errors.length})
                    </Label>
                    {importResult.hasMoreErrors && (
                      <Badge variant="destructive" className="text-xs">
                        Hiển thị 50/{importResult.totalErrors} lỗi
                      </Badge>
                    )}
                  </div>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-16">Dòng</TableHead>
                          <TableHead>Tên sản phẩm</TableHead>
                          <TableHead className="w-32">Barcode</TableHead>
                          <TableHead>Lỗi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.map((err, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">
                              {err.row}
                            </TableCell>
                            <TableCell className="text-sm">
                              {err.name || "N/A"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {err.barcode || "---"}
                            </TableCell>
                            <TableCell className="text-red-600 dark:text-red-400 text-xs">
                              {err.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importResult.hasMoreErrors && (
                    <p className="text-xs text-muted-foreground text-center">
                      Còn {(importResult.totalErrors || 0) - 50} lỗi khác không được hiển thị
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {step === "upload" && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
            )}

            {step === "preview" && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  Quay lại
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!preview?.isValid || isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import {preview?.total} sản phẩm
                </Button>
              </>
            )}

            {step === "result" && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  Import tiếp
                </Button>
                <Button onClick={() => onOpenChange(false)}>Đóng</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
