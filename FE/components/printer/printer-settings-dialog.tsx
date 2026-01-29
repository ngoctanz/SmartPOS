/**
 * Printer Settings Dialog
 *
 * Dialog cấu hình máy in
 * - Cho phép bật/tắt auto-print
 * - Cho phép reset config
 * - Hiển thị thông tin config hiện tại
 *
 * @module PrinterSettingsDialog
 */

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import {
  Printer,
  RotateCcw,
  Clock,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { PrinterConfig } from "@/utils/printer-config";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// === Types ===

export interface PrinterSettingsDialogProps {
  /** Dialog đang mở */
  open: boolean;
  /** Callback đóng dialog */
  onOpenChange: (open: boolean) => void;
  /** Config hiện tại */
  config: PrinterConfig;
  /** Máy in đã sẵn sàng */
  isReady: boolean;
  /** Callback khi thay đổi alwaysShowDialog */
  onAlwaysShowDialogChange: (value: boolean) => void;
  /** Callback khi thay đổi autoResetOnLogout */
  onAutoResetOnLogoutChange: (value: boolean) => void;
  /** Callback khi reset config */
  onReset: () => void;
  /** Callback khi test print */
  onTestPrint?: () => void;
}

// === Component ===

export function PrinterSettingsDialog({
  open,
  onOpenChange,
  config,
  isReady,
  onAlwaysShowDialogChange,
  onAutoResetOnLogoutChange,
  onReset,
  onTestPrint,
}: PrinterSettingsDialogProps) {
  const [confirmReset, setConfirmReset] = React.useState(false);

  // Reset confirm state khi đóng dialog
  React.useEffect(() => {
    if (!open) {
      setConfirmReset(false);
    }
  }, [open]);

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }

    onReset();
    setConfirmReset(false);
    onOpenChange(false);
  };

  // Format thời gian cấu hình
  const lastConfiguredText = config.lastConfiguredAt
    ? format(new Date(config.lastConfiguredAt), "HH:mm - dd/MM/yyyy", {
        locale: vi,
      })
    : "Chưa cấu hình";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Cài đặt máy in
          </DialogTitle>
          <DialogDescription>Cấu hình cách thức in hóa đơn</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trạng thái hiện tại */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Trạng thái</span>
              <Badge variant={isReady ? "default" : "secondary"}>
                <Printer className="h-3 w-3 mr-1" />
                {isReady ? "Đã cấu hình" : "Chưa cấu hình"}
              </Badge>
            </div>

            {config.lastConfiguredAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Cấu hình lúc: {lastConfiguredText}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Tùy chọn */}
          <div className="space-y-4">
            {/* Luôn hiện dialog */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="always-dialog" className="font-medium">
                  Luôn hiện hộp thoại in
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tắt chế độ in tự động, luôn hiện hộp thoại chọn máy in
                </p>
              </div>
              <Switch
                id="always-dialog"
                checked={config.alwaysShowDialog}
                onCheckedChange={onAlwaysShowDialogChange}
              />
            </div>

            {/* Auto reset khi logout */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-reset" className="font-medium">
                  Reset khi đăng xuất
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tự động xóa cấu hình khi đăng xuất
                </p>
              </div>
              <Switch
                id="auto-reset"
                checked={config.autoResetOnLogout}
                onCheckedChange={onAutoResetOnLogoutChange}
              />
            </div>
          </div>

          <Separator />

          {/* Thông tin thêm */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-800">
              <strong>Lưu ý:</strong> Cấu hình máy in sẽ tự động hết hạn sau 12
              giờ để đảm bảo mỗi ca làm việc đều được thiết lập lại.
            </p>
          </div>

          {/* Reset button */}
          <div className="pt-2">
            {confirmReset ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    Xác nhận reset?
                  </span>
                </div>
                <p className="text-xs text-amber-700 mb-3">
                  Lần in tiếp theo sẽ hiện hộp thoại chọn máy in.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmReset(false)}
                  >
                    Hủy
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleReset}>
                    Xác nhận reset
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Cấu hình lại máy in
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {onTestPrint && (
            <Button variant="outline" onClick={onTestPrint}>
              <Printer className="h-4 w-4 mr-2" />
              In thử
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PrinterSettingsDialog;
