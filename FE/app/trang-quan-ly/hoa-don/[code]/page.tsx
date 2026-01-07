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
  Edit2,
  Save,
  X,
  Loader2,
  Receipt as ReceiptIcon,
  Calendar,
  User,
  Store,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import receiptService, { Receipt } from "@/service/receipt.service";
import productService, { Product } from "@/service/product.service";
import { ROUTES } from "@/configs/routes.config";
import {
  CartItemsTable,
  CartItem,
  PrintBill,
  printStyles,
} from "@/components/receipt";
import { SmartProductInput } from "@/components/common/smart-product-input";
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

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user } = useAuthContext();

  const [receipt, setReceipt] = React.useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPrintDialog, setShowPrintDialog] = React.useState(false);
  const [showConfirmSave, setShowConfirmSave] = React.useState(false);

  // Edit mode state
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
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
          // Convert to cart items for editing
          const items: CartItem[] = response.data.listProduct.map((p) => ({
            productId: p.productId,
            productName: p.productName,
            barcode: "",
            quantity: p.quantity,
            salePrice: p.salePrice,
            unit: "",
          }));
          setCartItems(items);
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

  // Handle barcode scanned
  const handleBarcodeScanned = React.useCallback(
    async (barcode: string) => {
      const existingItem = cartItems.find((item) => item.barcode === barcode);

      if (existingItem) {
        setCartItems((prev) =>
          prev.map((item) =>
            item.barcode === barcode
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        toast.success(`+1 ${existingItem.productName}`);
      } else {
        try {
          const response = await productService.getByBarcode(barcode);
          if (response.success && response.data) {
            const product = response.data;
            setCartItems((prev) => [
              ...prev,
              {
                productId: product._id,
                productName: product.name,
                barcode: product.barcode || barcode,
                quantity: 1,
                salePrice: product.currentSalePrice,
                unit: product.unit,
                image: product.image,
              },
            ]);
            toast.success(`Đã thêm: ${product.name}`);
          } else {
            toast.error("Không tìm thấy sản phẩm");
          }
        } catch (error) {
          toast.error((error as Error).message || "Không tìm thấy sản phẩm");
        }
      }
    },
    [cartItems]
  );

  // Handle search
  const handleSearch = React.useCallback(async (term: string) => {
    const response = await productService.search({ name: term });
    return response.success && response.data ? response.data : [];
  }, []);

  // Get product by barcode for SmartProductInput
  const getProductByBarcode = React.useCallback(
    async (barcode: string): Promise<Product | null> => {
      try {
        const response = await productService.getByBarcode(barcode);
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  // Handle product select from search
  const handleProductSelect = React.useCallback(
    (product: Product) => {
      const existingItem = cartItems.find(
        (item) => item.productId === product._id
      );

      if (existingItem) {
        setCartItems((prev) =>
          prev.map((item) =>
            item.productId === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        toast.success(`+1 ${product.name}`);
      } else {
        setCartItems((prev) => [
          ...prev,
          {
            productId: product._id,
            productName: product.name,
            barcode: product.barcode || "",
            quantity: 1,
            salePrice: product.currentSalePrice,
            unit: product.unit,
            image: product.image,
          },
        ]);
        toast.success(`Đã thêm: ${product.name}`);
      }
    },
    [cartItems]
  );

  // Update quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      setCartItems((prev) =>
        prev.filter((item) => item.productId !== productId)
      );
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item
  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Calculate total
  const calculateTotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.salePrice * item.quantity,
      0
    );
  };

  // Cancel edit
  const handleCancelEdit = () => {
    if (receipt) {
      const items: CartItem[] = receipt.listProduct.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        barcode: "",
        quantity: p.quantity,
        salePrice: p.salePrice,
        unit: "",
      }));
      setCartItems(items);
    }
    setIsEditing(false);
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (!receipt) return;

    if (cartItems.length === 0) {
      toast.error("Hóa đơn phải có ít nhất 1 sản phẩm");
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        listProduct: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          salePrice: item.salePrice,
        })),
        totalAmount: calculateTotal(),
      };

      const response = await receiptService.update(receipt._id, updateData);

      if (response.success && response.data) {
        setReceipt(response.data);
        setIsEditing(false);
        setShowConfirmSave(false);
        toast.success("Cập nhật hóa đơn thành công!");
      } else {
        toast.error(response.message || "Không thể cập nhật hóa đơn");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi cập nhật hóa đơn");
    } finally {
      setIsSaving(false);
    }
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(ROUTES.INVOICES)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Hóa đơn {receipt.code}</h1>
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
            </div>
            <p className="text-sm text-muted-foreground">
              Chi tiết và chỉnh sửa hóa đơn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            In hóa đơn
          </Button>
          {!isEditing && receipt.status !== "cancelled" && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Hủy
              </Button>
              <Button onClick={() => setShowConfirmSave(true)}>
                <Save className="h-4 w-4 mr-2" />
                Lưu thay đổi
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 flex-1 min-h-0">
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

          {/* Edit Mode - Add Products */}
          {isEditing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Thêm sản phẩm</CardTitle>
              </CardHeader>
              <CardContent>
                <SmartProductInput
                  onProductSelect={handleProductSelect}
                  searchFn={handleSearch}
                  getByBarcodeFn={getProductByBarcode}
                  placeholder="Quét mã barcode hoặc nhập tên sản phẩm..."
                  autoFocus
                />
              </CardContent>
            </Card>
          )}

          {/* Products Table */}
          {isEditing ? (
            <CartItemsTable
              items={cartItems}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
              onClearAll={clearCart}
            />
          ) : (
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
          )}
        </div>

        {/* Right Panel - Summary */}
        <div className="w-80 flex flex-col gap-4">
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
                    {isEditing
                      ? cartItems.reduce((sum, p) => sum + p.quantity, 0)
                      : receipt.listProduct.reduce(
                          (sum, p) => sum + p.quantity,
                          0
                        )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính:</span>
                  <span>
                    {formatCurrency(
                      isEditing ? calculateTotal() : receipt.totalAmount
                    )}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">Tổng cộng:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(
                    isEditing ? calculateTotal() : receipt.totalAmount
                  )}
                </span>
              </div>

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

      {/* Confirm Save Dialog */}
      <Dialog open={showConfirmSave} onOpenChange={setShowConfirmSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận cập nhật</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn cập nhật hóa đơn này không?
              <br />
              Tổng tiền mới:{" "}
              <span className="font-semibold text-primary">
                {formatCurrency(calculateTotal())}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmSave(false)}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Xác nhận"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Component */}
      <div className="hidden">
        <PrintBill ref={printRef} receipt={receipt} />
      </div>
    </div>
  );
}
