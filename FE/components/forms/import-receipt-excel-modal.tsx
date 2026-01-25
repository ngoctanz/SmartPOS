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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Trash2,
} from "lucide-react";
import importReceiptService from "@/service/import-receipt.service";
import { Branch } from "@/service/branch.service";

interface ImportReceiptExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  branches: Branch[];
  userBranchId?: string;
  isAdmin: boolean;
}

export function ImportReceiptExcelModal({
  open,
  onOpenChange,
  onSuccess,
  branches,
  userBranchId,
  isAdmin,
}: ImportReceiptExcelModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [selectedBranchId, setSelectedBranchId] = React.useState<string | undefined>(
    isAdmin ? undefined : userBranchId
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<any | null>(null);
  const [step, setStep] = React.useState<"upload" | "processing" | "result">("upload");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      handleReset();
      if (!isAdmin && userBranchId) {
        setSelectedBranchId(userBranchId);
      }
    }
  }, [open, isAdmin, userBranchId]);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Don't reset branch selection if admin
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

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
  };

  const handleImport = async () => {
    if (!file) return;
    
    if (isAdmin && !selectedBranchId) {
      toast.error("Vui lòng chọn chi nhánh nhập hàng");
      return;
    }

    try {
      setIsLoading(true);
      setStep("processing");
      
      const response = await importReceiptService.importExcel(
        file, 
        isAdmin ? selectedBranchId : undefined
      );
      
      setResult(response.data);
      setStep("result");
      toast.success("Tạo phiếu nhập thành công!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Lỗi khi import phiếu nhập");
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-700" />
            Nhập kho bằng Excel
          </DialogTitle>
          <DialogDescription>
            Tạo phiếu nhập hàng và cập nhật tồn kho tự động từ file Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "upload" && (
            <div className="space-y-4">
              {/* Branch Selection (Admin only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Chi nhánh nhập hàng <span className="text-destructive">*</span></Label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={setSelectedBranchId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn chi nhánh..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b._id} value={b._id}>
                          {b.branchName}  
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* File Upload Area */}
              <div className="space-y-2">
                <Label>File Excel dữ liệu</Label>
                {!file ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
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
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-primary">
                          Nhấn để chọn file
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Hỗ trợ: .xlsx, .xls, .csv
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-muted/20 relative group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size < 1024 * 1024 
                            ? `${(file.size / 1024).toFixed(2)} KB` 
                            : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                        </p>
                      </div>
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Guide Alert */}
              <Alert className="bg-blue-50 text-blue-900 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  <strong>Quy tắc Import:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>File cần có các cột: <strong>Nhóm hàng</strong>, <strong>Tên hàng</strong>, <strong>Số lượng</strong>, <strong>Giá vốn</strong>.</li>
                    <li>Nếu có cột <strong>Mã vạch</strong>, hệ thống ưu tiên check trùng theo mã vạch.</li>
                    <li>Nếu chưa có sản phẩm, hệ thống sẽ <strong>tự động tạo mới</strong> (cần cột Giá bán, Hình ảnh nếu có).</li>
                    <li>Phiếu nhập tạo ra sẽ ở trạng thái <strong>Chờ xử lý</strong>.</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button onClick={handleImport} disabled={!file || (isAdmin && !selectedBranchId)}>
                  Tiến hành Import
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Đang xử lý dữ liệu...</h3>
                <p className="text-muted-foreground">Vui lòng không đóng cửa sổ này.</p>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700">Import Thành Công!</h3>
                <p className="text-muted-foreground">
                  Đã tạo phiếu nhập <strong>{result.receipt?.code}</strong>
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3 bg-muted/40">
                  <p className="text-xs text-muted-foreground">Sản phẩm trong file</p>
                  <p className="text-2xl font-bold">{result.stats?.totalItems}</p>
                </div>
                <div className="border rounded-lg p-3 bg-green-50 border-green-100">
                  <p className="text-xs text-green-700">Sản phẩm mới tạo</p>
                  <p className="text-2xl font-bold text-green-700">{result.stats?.createdProducts}</p>
                </div>
                <div className="border rounded-lg p-3 bg-blue-50 border-blue-100">
                  <p className="text-xs text-blue-700">Tổng tiền nhập</p>
                  <p className="text-lg font-bold text-blue-700">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.stats?.totalAmount || 0)}
                  </p>
                </div>
                <div className="border rounded-lg p-3 bg-orange-50 border-orange-100">
                  <p className="text-xs text-orange-700">Cảnh báo/Lỗi dòng</p>
                  <p className="text-2xl font-bold text-orange-700">{result.stats?.warnings?.length || 0}</p>
                </div>
              </div>

              {/* Warning Details */}
              {result.stats?.warnings?.length > 0 && (
                <div className="border rounded-lg p-4 bg-orange-50/50">
                  <h4 className="font-semibold text-orange-800 mb-2 text-sm">Chi tiết cảnh báo:</h4>
                  <ul className="max-h-32 overflow-y-auto list-disc list-inside text-xs text-orange-700 space-y-1">
                    {result.stats.warnings.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleReset}>
                  Import tiếp
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
