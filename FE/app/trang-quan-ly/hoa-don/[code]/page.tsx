"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Printer,
  Loader2,
  Receipt as ReceiptIcon,
  Calendar,
  User,
  Store,
  CreditCard,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import receiptService, { Receipt } from "@/service/receipt.service";
import { ROUTES } from "@/configs/routes.config";
import {
  PrintBill,
  printStyles,
  MarkErrorDialog,
} from "@/components/receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/format.utils";
import { useSocket } from "@/hooks/useSocket";
import { useAuthContext } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user } = useAuthContext();

  const [receipt, setReceipt] = React.useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showPrintDialog, setShowPrintDialog] = React.useState(false);
  const [showMarkErrorDialog, setShowMarkErrorDialog] = React.useState(false);
  const [isMarkingError, setIsMarkingError] = React.useState(false);

  const printRef = React.useRef<HTMLDivElement>(null);

  // Real-time payment notifications via WebSocket
  useSocket({
    onPaymentSuccess: (data) => {
      // Only refresh if this receipt was paid
      if (receipt && data.receiptCode === receipt.code) {
        toast.success(
          `Hóa đơn ${data.receiptCode} đã thanh toán thành công: ${formatCurrency(data.amount)}`,
          {
            duration: 5000,
            position: "top-right",
          }
        );
        // Refresh receipt data
        const fetchReceipt = async () => {
          try {
            const response = await receiptService.getByCode(code);
            if (response.success && response.data) {
              setReceipt(response.data);
            }
          } catch (error) {
            console.error("Failed to refresh receipt:", error);
          }
        };
        fetchReceipt();
      }
    },
    enabled: true,
  });

  // Fetch receipt data
  React.useEffect(() => {
    const fetchReceipt = async () => {
      setIsLoading(true);
      try {
        const response = await receiptService.getByCode(code);
        if (response.success && response.data) {
          setReceipt(response.data);
        } else {
          toast.error("Không tìm thấy hóa đơn");
          router.push(ROUTES.INVOICES);
        }
      } catch (error) {
        toast.error((error as Error).message || "Không thể tải hóa đơn");
        router.push(ROUTES.INVOICES);
      } finally {
        setIsLoading(false);
      }
    };

    if (code) {
      fetchReceipt();
    }
  }, [code, router]);

  // Get branch name
  const getBranchName = () => {
    if (!receipt) return "—";
    if (typeof receipt.branchId === "object" && receipt.branchId?.branchName)
      return receipt.branchId.branchName;
    return "—";
  };

  // Get cashier name
  const getCashierName = () => {
    if (!receipt) return "";
    if (typeof receipt.createdBy === "object")
      return receipt.createdBy.name || receipt.createdBy.userName;
    return receipt.createdBy;
  };

  // Payment method text
  const getPaymentMethodText = () => {
    if (!receipt) return "";
    switch (receipt.paymentMethod) {
      case "cash":
        return "Tiền mặt";
      case "card":
        return "Thẻ";
      case "transfer":
        return "Chuyển khoản";
      default:
        return receipt.paymentMethod;
    }
  };

  // Mark receipt as error
  const handleMarkError = async (errorReason?: string) => {
    if (!receipt) return;

    setIsMarkingError(true);
    try {
      const response = await receiptService.markAsError(receipt._id, errorReason);

      if (response.success && response.data) {
        setReceipt(response.data);
        setShowMarkErrorDialog(false);
        toast.success("Đã đánh dấu hóa đơn lỗi và hoàn hàng về kho!");
      } else {
        toast.error(response.message || "Không thể đánh dấu hóa đơn lỗi");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi đánh dấu hóa đơn lỗi");
    } finally {
      setIsMarkingError(false);
    }
  };

  // Recreate receipt from error
  const handleRecreateReceipt = () => {
    if (!receipt) return;
    router.push(`/trang-quan-ly/hoa-don/tao-moi?fromError=${receipt.code}`);
  };

  // Print bill
  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    // Add print styles
    const styleSheet = document.createElement("style");
    styleSheet.innerHTML = printStyles;
    document.head.appendChild(styleSheet);

    window.print();

    // Cleanup
    setTimeout(() => {
      document.head.removeChild(styleSheet);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p>Không tìm thấy hóa đơn</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(ROUTES.INVOICES)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">Hóa đơn {receipt.code}</h1>
              {receipt.isError && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Hóa đơn lỗi
                </Badge>
              )}
              {!receipt.isError && (
                <Badge
                  variant={
                    receipt.status === "completed"
                      ? "default"
                      : receipt.status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {receipt.status === "completed"
                    ? "Hoàn thành"
                    : receipt.status === "pending"
                    ? "Chờ thanh toán"
                    : "Đã hủy"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {receipt.isError
                ? "Hóa đơn đã được đánh dấu lỗi"
                : "Chi tiết và chỉnh sửa hóa đơn"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">In hóa đơn</span>
          </Button>
          
          {/* Normal receipt - show mark error button */}
          {!receipt.isError && receipt.status !== "cancelled" && (
            <Button
              variant="destructive"
              onClick={() => setShowMarkErrorDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Đánh dấu lỗi</span>
            </Button>
          )}

          {/* Error receipt - show recreate button */}
          {receipt.isError && (
            <Button onClick={handleRecreateReceipt}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Tạo lại hóa đơn</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error Info Alert */}
      {receipt.isError && receipt.markedErrorBy && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Hóa đơn đã được đánh dấu lỗi</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <strong>Người đánh dấu:</strong>{" "}
                {typeof receipt.markedErrorBy === "object"
                  ? receipt.markedErrorBy.name || receipt.markedErrorBy.userName
                  : "—"}
              </p>
              {receipt.markedErrorAt && (
                <p>
                  <strong>Thời gian:</strong>{" "}
                  {format(new Date(receipt.markedErrorAt), "dd/MM/yyyy HH:mm")}
                </p>
              )}
              {receipt.errorReason && (
                <p>
                  <strong>Lý do:</strong> {receipt.errorReason}
                </p>
              )}
              <p className="mt-2 text-muted-foreground">
                Sản phẩm đã được hoàn về kho. Bạn có thể tạo lại hóa đơn mới.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Panel - Receipt Info & Products */}
        <div className="flex-1 flex flex-col min-w-0 gap-4">
          {/* Receipt Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thông tin hóa đơn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mã hóa đơn</p>
                    <p className="font-medium">{receipt.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ngày lập</p>
                    <p className="font-medium">
                      {format(new Date(receipt.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Chi nhánh</p>
                    <p className="font-medium">{getBranchName()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Thu ngân</p>
                    <p className="font-medium">{getCashierName()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Danh sách sản phẩm ({receipt.listProduct.length} sản phẩm)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">STT</th>
                      <th className="text-left p-3 font-medium">Sản phẩm</th>
                      <th className="text-right p-3 font-medium">Đơn giá</th>
                      <th className="text-center p-3 font-medium">SL</th>
                      <th className="text-right p-3 font-medium">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.listProduct.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3 text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="p-3 font-medium">
                          {item.productName}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(item.salePrice)}
                        </td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(item.salePrice * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Summary */}
        <div className="lg:w-80 lg:flex-shrink-0 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Phương thức:
                </span>
                <Badge variant="outline">{getPaymentMethodText()}</Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Số lượng SP:</span>
                  <span>
                    {receipt.listProduct.reduce((sum, p) => sum + p.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính:</span>
                  <span>{formatCurrency(receipt.totalAmount)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">Tổng cộng:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(receipt.totalAmount)}
                </span>
              </div>

              {/* Tiền khách đưa và tiền thối - chỉ hiện khi thanh toán tiền mặt */}
              {receipt.paymentMethod === "cash" && receipt.customerPaid != null && receipt.customerPaid > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tiền khách đưa:</span>
                    <span className="font-medium">{formatCurrency(receipt.customerPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tiền thối:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(receipt.customerPaid - receipt.totalAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment QR for transfer */}
              {receipt.paymentMethod === "transfer" && (
                <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                  <h4 className="text-sm font-medium text-center mb-2">
                    Mã QR Thanh toán
                  </h4>
                  <div className="flex justify-center">
                    {/* VietQR - Direct bank app scanning */}
                    {receipt.paymentInfo?.qrCode ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={receipt.paymentInfo.qrCode}
                        alt="Payment QR"
                        className="w-40 h-40 rounded-lg object-contain bg-white p-1"
                        onError={(e) => {
                          // Fallback: regenerate QR from saved info
                          const info = receipt.paymentInfo;
                          if (
                            info?.bin &&
                            info?.accountNumber &&
                            info?.amount
                          ) {
                            (
                              e.target as HTMLImageElement
                            ).src = `https://img.vietqr.io/image/${info.bin}-${
                              info.accountNumber
                            }-compact2.png?amount=${
                              info.amount
                            }&addInfo=${encodeURIComponent(
                              info.description || ""
                            )}&accountName=${encodeURIComponent(
                              info.accountName || ""
                            )}`;
                          }
                        }}
                      />
                    ) : receipt.paymentInfo?.bin &&
                      receipt.paymentInfo?.accountNumber ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://img.vietqr.io/image/${
                          receipt.paymentInfo.bin
                        }-${
                          receipt.paymentInfo.accountNumber
                        }-compact2.png?amount=${
                          receipt.paymentInfo.amount || receipt.totalAmount
                        }&addInfo=${encodeURIComponent(
                          receipt.paymentInfo.description || receipt.code
                        )}&accountName=${encodeURIComponent(
                          receipt.paymentInfo.accountName || ""
                        )}`}
                        alt="Payment QR"
                        className="w-40 h-40 rounded-lg object-contain bg-white p-1"
                      />
                    ) : (
                      <div className="w-40 h-40 bg-muted flex items-center justify-center rounded-lg">
                        <span className="text-xs text-muted-foreground">
                          Không có QR
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bank account info */}
                  {receipt.paymentInfo?.accountNumber && (
                    <div className="mt-2 text-xs space-y-1 text-center">
                      <p className="text-muted-foreground">
                        {receipt.paymentInfo.accountName}
                      </p>
                      <p className="font-mono font-medium">
                        {receipt.paymentInfo.accountNumber}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Trạng thái:{" "}
                    <Badge
                      variant={
                        receipt.paymentInfo?.status === "paid"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {receipt.paymentInfo?.status === "paid"
                        ? "Đã thanh toán"
                        : receipt.paymentInfo?.status === "pending"
                        ? "Chờ thanh toán"
                        : receipt.paymentInfo?.status || "N/A"}
                    </Badge>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem trước hóa đơn</DialogTitle>
            <DialogDescription>
              Xem trước trước khi in hóa đơn
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4 bg-gray-100 rounded-lg">
            <PrintBill ref={printRef} receipt={receipt} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                setShowPrintDialog(false);
                setTimeout(executePrint, 100);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              In hóa đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Component */}
      <div className="hidden">
        <PrintBill ref={printRef} receipt={receipt} />
      </div>

      {/* Mark Error Dialog */}
      <MarkErrorDialog
        open={showMarkErrorDialog}
        onOpenChange={setShowMarkErrorDialog}
        receipt={receipt}
        onConfirm={handleMarkError}
        isSubmitting={isMarkingError}
      />
    </div>
  );
}
