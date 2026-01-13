"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Maximize2, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/utils/format.utils";
import { toast } from "sonner";

// Danh sách ngân hàng phổ biến (mở rộng sau)
const BANK_LIST = [
  { bin: "970422", name: "MB Bank", shortName: "MB" },
  { bin: "970415", name: "VietinBank", shortName: "VietinBank" },
  { bin: "970436", name: "Vietcombank", shortName: "VCB" },
  { bin: "970418", name: "BIDV", shortName: "BIDV" },
  { bin: "970405", name: "Agribank", shortName: "Agribank" },
  { bin: "970407", name: "Techcombank", shortName: "TCB" },
  { bin: "970416", name: "ACB", shortName: "ACB" },
  { bin: "970432", name: "VPBank", shortName: "VPB" },
  { bin: "970423", name: "TPBank", shortName: "TPB" },
  { bin: "970448", name: "OCB", shortName: "OCB" },
  { bin: "970426", name: "MSB", shortName: "MSB" },
  { bin: "970403", name: "Sacombank", shortName: "Sacombank" },
  { bin: "970441", name: "VIB", shortName: "VIB" },
  { bin: "970443", name: "SHB", shortName: "SHB" },
  { bin: "970431", name: "Eximbank", shortName: "EIB" },
];

export interface BankAccount {
  bin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface QRPaymentInfo {
  orderCode?: number;
  linkId?: string;
  qrCode?: string;
  checkoutUrl?: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  amount: number;
  description?: string;
  status?: "pending" | "paid" | "cancelled" | "expired" | "";
}

interface QRInlineDisplayProps {
  paymentInfo: QRPaymentInfo | null;
  totalAmount: number;
  receiptCode?: string;
  remainingTime?: string;
  isExpired?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // Nếu muốn cho phép chọn tài khoản ngân hàng
  bankAccounts?: BankAccount[];
  selectedBankAccount?: BankAccount | null;
  onBankAccountChange?: (account: BankAccount) => void;
  showBankSelector?: boolean;
}

export function QRInlineDisplay({
  paymentInfo,
  totalAmount,
  receiptCode,
  remainingTime,
  isExpired = false,
  onRefresh,
  isRefreshing = false,
  bankAccounts = [],
  selectedBankAccount,
  onBankAccountChange,
  showBankSelector = false,
}: QRInlineDisplayProps) {
  const [showFullModal, setShowFullModal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Tạo QR URL từ VietQR
  const getQRImageUrl = React.useCallback(() => {
    // Nếu có qrCode base64/URL từ API
    if (paymentInfo?.qrCode) {
      return paymentInfo.qrCode;
    }

    // Fallback: tạo URL VietQR từ thông tin bank
    const info = paymentInfo;
    if (info?.bin && info?.accountNumber) {
      const amount = info.amount || totalAmount;
      const description = info.description || receiptCode || "";
      return `https://img.vietqr.io/image/${info.bin}-${
        info.accountNumber
      }-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
        description
      )}&accountName=${encodeURIComponent(info.accountName || "")}`;
    }

    return null;
  }, [paymentInfo, totalAmount, receiptCode]);

  const qrImageUrl = getQRImageUrl();

  // Copy số tài khoản
  const handleCopyAccount = async () => {
    if (!paymentInfo?.accountNumber) return;
    try {
      await navigator.clipboard.writeText(paymentInfo.accountNumber);
      setCopied(true);
      toast.success("Đã copy số tài khoản");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể copy");
    }
  };

  // Lấy tên ngân hàng từ BIN
  const getBankName = (bin: string) => {
    const bank = BANK_LIST.find((b) => b.bin === bin);
    return bank?.shortName || bank?.name || bin;
  };

  if (!paymentInfo && !selectedBankAccount) {
    return null;
  }

  const displayInfo = paymentInfo || {
    bin: selectedBankAccount?.bin || "",
    accountNumber: selectedBankAccount?.accountNumber || "",
    accountName: selectedBankAccount?.accountName || "",
    amount: totalAmount,
    description: receiptCode || "",
  };

  return (
    <>
      <div className="border rounded-lg p-3 bg-background">
        {/* Bank Account Selector */}
        {showBankSelector && bankAccounts.length > 0 && onBankAccountChange && (
          <div className="mb-3 pb-3 border-b">
            <Select
              value={selectedBankAccount?.accountNumber || ""}
              onValueChange={(value) => {
                const account = bankAccounts.find(
                  (a) => a.accountNumber === value
                );
                if (account) {
                  onBankAccountChange(account);
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Chọn tài khoản ngân hàng" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem
                    key={account.accountNumber}
                    value={account.accountNumber}
                  >
                    {getBankName(account.bin)} - {account.accountNumber} -{" "}
                    {account.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Main Content - QR và Info */}
        <div className="flex gap-3 items-start">
          {/* QR Code nhỏ - bên trái */}
          <div className="shrink-0">
            <div className="w-24 h-24 bg-white rounded-md border p-1 relative">
              {qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageUrl}
                  alt="Payment QR"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback nếu load ảnh lỗi
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : displayInfo.bin && displayInfo.accountNumber ? (
                <QRCodeSVG
                  value={`https://img.vietqr.io/image/${displayInfo.bin}-${
                    displayInfo.accountNumber
                  }-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(
                    receiptCode || ""
                  )}`}
                  size={88}
                  level="L"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  No QR
                </div>
              )}
            </div>
          </div>

          {/* Bank Info - bên phải */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Bank name + account */}
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm truncate">
                {getBankName(displayInfo.bin)} - {displayInfo.accountNumber}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleCopyAccount}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Account name */}
            <p className="text-xs text-muted-foreground truncate">
              {displayInfo.accountName}
            </p>

            {/* Show full QR button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs mt-1"
              onClick={() => setShowFullModal(true)}
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Hiện mã QR
            </Button>
          </div>
        </div>

        {/* Remaining time + Refresh */}
        {(remainingTime || onRefresh) && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            {remainingTime && (
              <span
                className={`text-xs ${
                  isExpired ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {isExpired ? "Mã QR đã hết hạn" : `Còn lại: ${remainingTime}`}
              </span>
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Làm mới QR
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Full QR Modal */}
      <Dialog open={showFullModal} onOpenChange={setShowFullModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-center">Mã QR thanh toán</DialogTitle>
            <DialogDescription className="text-center">
              Quét mã để thanh toán {formatCurrency(totalAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center gap-4 py-4">
            {/* QR Code lớn */}
            <div className="p-3 bg-white rounded-xl border-2 shadow-sm flex-shrink-0">
              {qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageUrl}
                  alt="QR Thanh toán"
                  className="w-56 h-56 object-contain"
                />
              ) : displayInfo.bin && displayInfo.accountNumber ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://img.vietqr.io/image/${displayInfo.bin}-${
                    displayInfo.accountNumber
                  }-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(
                    receiptCode || ""
                  )}&accountName=${encodeURIComponent(
                    displayInfo.accountName || ""
                  )}`}
                  alt="QR Thanh toán"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <QRCodeSVG
                  value={paymentInfo?.checkoutUrl || ""}
                  size={220}
                  level="H"
                />
              )}
            </div>

            {/* Bank info */}
            <div className="w-full p-3 bg-muted/50 rounded-lg text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ngân hàng:</span>
                <span className="font-medium">
                  {getBankName(displayInfo.bin)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Số TK:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-medium">
                    {displayInfo.accountNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyAccount}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chủ TK:</span>
                <span className="font-medium">{displayInfo.accountName}</span>
              </div>
              {(displayInfo.description || receiptCode) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nội dung:</span>
                  <span className="font-medium">
                    {displayInfo.description || receiptCode}
                  </span>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="text-center flex-shrink-0">
              <p className="text-sm text-muted-foreground">Số tiền</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            {/* Remaining time */}
            {remainingTime && (
              <p className="text-sm text-muted-foreground flex-shrink-0">
                {isExpired ? (
                  <span className="text-destructive">Mã QR đã hết hạn</span>
                ) : (
                  <>
                    Mã QR hết hạn sau:{" "}
                    <span className="font-medium">{remainingTime}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
