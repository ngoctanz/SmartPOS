"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import productService, { Product } from "@/service/product.service";
import receiptService, {
  CreateReceiptRequest,
  Receipt,
} from "@/service/receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";
import { CartItemsTable, PaymentSummary, CartItem } from "@/components/receipt";
import { SmartProductInput } from "@/components/common/smart-product-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/useSocket";
import { formatCurrency } from "@/utils/format.utils";

export default function CreateReceiptPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("");
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "transfer">(
    "cash"
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Payment QR Dialog state
  const [showQRDialog, setShowQRDialog] = React.useState(false);
  const [paymentData, setPaymentData] = React.useState<Receipt | null>(null);

  // Real-time payment notifications via WebSocket
  useSocket({
    onPaymentSuccess: (data) => {
      toast.success(
        `Đơn hàng ${
          data.receiptCode
        } đã thanh toán thành công: ${formatCurrency(data.amount)}`,
        {
          duration: 5000,
          position: "top-right",
        }
      );
      // If currently showing QR for this receipt, close dialog and redirect
      if (paymentData?.code === data.receiptCode) {
        setShowQRDialog(false);
        toast.info("Chuyển đến trang chi tiết đơn hàng...");
        setTimeout(() => {
          router.push(`/trang-quan-ly/hoa-don/${data.receiptCode}`);
        }, 1500);
      }
    },
    enabled: true,
  });

  // Load branches
  React.useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll();
        if (response.success && response.data) {
          setBranches(response.data);
          if (user?.branchId) {
            setSelectedBranch(user.branchId);
          } else if (response.data.length > 0) {
            setSelectedBranch(response.data[0]._id);
          }
        }
      } catch {
        toast.error("Không thể tải danh sách chi nhánh");
      }
    };
    loadBranches();
  }, [user?.branchId]);

  // Prefill from error receipt if fromError param exists
  React.useEffect(() => {
    const loadFromError = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorCode = params.get("fromError");

      if (errorCode) {
        try {
          const response = await receiptService.getByCode(errorCode);
          if (response.success && response.data) {
            const errorReceipt = response.data;

            // Verify it's actually an error receipt
            if (!errorReceipt.isError) {
              toast.error("Hóa đơn này không phải hóa đơn lỗi");
              return;
            }

            // Fetch full product details to get barcode and unit
            const items: CartItem[] = [];
            const deletedProducts: string[] = [];
            
            await Promise.all(
              errorReceipt.listProduct.map(async (p) => {
                try {
                  const productResponse = await productService.getById(
                    p.productId
                  );
                  if (productResponse.success && productResponse.data) {
                    const product = productResponse.data;
                    items.push({
                      productId: p.productId,
                      productName: p.productName,
                      barcode: product?.barcode || "",
                      quantity: p.quantity,
                      salePrice: p.salePrice,
                      unit: product?.unit || "",
                      image: product?.images?.[0],
                    });
                  } else {
                    // Product deleted
                    deletedProducts.push(p.productName);
                  }
                } catch (error) {
                  // Product deleted
                  deletedProducts.push(p.productName);
                  console.error(
                    `Failed to fetch product ${p.productId}:`,
                    error
                  );
                }
              })
            );

            setCartItems(items);
            
            // Only set payment method if it's cash or transfer (not card)
            if (
              errorReceipt.paymentMethod === "cash" ||
              errorReceipt.paymentMethod === "transfer"
            ) {
              setPaymentMethod(errorReceipt.paymentMethod);
            }
            
            // Show appropriate message
            if (items.length > 0 && deletedProducts.length === 0) {
              toast.success(
                `Đã tải ${items.length} sản phẩm từ hóa đơn lỗi ${errorCode}`,
                {
                  description: "Vui lòng kiểm tra và chỉnh sửa nếu cần",
                  duration: 5000,
                }
              );
            } else if (items.length > 0 && deletedProducts.length > 0) {
              toast.warning(
                `Đã tải ${items.length} sản phẩm. ${deletedProducts.length} sản phẩm đã bị xóa: ${deletedProducts.join(", ")}`,
                { duration: 7000 }
              );
            } else if (items.length === 0 && deletedProducts.length > 0) {
              toast.error(
                `Không thể tải sản phẩm. Tất cả ${deletedProducts.length} sản phẩm trong hóa đơn đã bị xóa khỏi hệ thống.`,
                { duration: 5000 }
              );
            }
          }
        } catch (error) {
          console.error("Failed to load error receipt:", error);
          toast.error("Không thể tải hóa đơn lỗi");
        }
      }
    };

    loadFromError();
  }, []);

  // Handle barcode scanned - search from Product
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
          // Admin truyền branchId từ dropdown, staff middleware tự inject
          const branchId = isAdmin ? selectedBranch : undefined;
          const response = await productService.getByBarcode(barcode, branchId);
          if (response.success && response.data) {
            const product = response.data;
            // Ưu tiên salePrice (giá theo chi nhánh), fallback về currentSalePrice
            const price = product.salePrice ?? product.currentSalePrice;
            
            setCartItems((prev) => [
              ...prev,
              {
                productId: product._id,
                productName: product.name,
                barcode: product.barcode || barcode,
                quantity: 1,
                salePrice: price,
                unit: product.unit,
                image: product.images?.[0],
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
    [cartItems, selectedBranch, isAdmin]
  );

  // Handle search - search from Product
  const handleSearch = React.useCallback(async (term: string) => {
    const branchId = isAdmin ? selectedBranch : undefined;
    const response = await productService.search({ name: term, branchId });
    return response.success && response.data ? response.data : [];
  }, [selectedBranch, isAdmin]);

  // Get product by barcode for SmartProductInput
  const getProductByBarcode = React.useCallback(
    async (barcode: string): Promise<Product | null> => {
      try {
        const branchId = isAdmin ? selectedBranch : undefined;
        const response = await productService.getByBarcode(barcode, branchId);
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      } catch {
        return null;
      }
    },
    [selectedBranch, isAdmin]
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
        // Ưu tiên salePrice (giá theo chi nhánh), fallback về currentSalePrice
        const price = product.salePrice ?? product.currentSalePrice;
        
        setCartItems((prev) => [
          ...prev,
          {
            productId: product._id,
            productName: product.name,
            barcode: product.barcode || "",
            quantity: 1,
            salePrice: price,
            unit: product.unit,
            image: product.images?.[0],
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

  // Submit - Direct without confirmation for speed
  const handleSubmit = React.useCallback(async () => {
    // Admin phải chọn chi nhánh, staff không cần (backend tự inject)
    if (isAdmin && !selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào giỏ hàng");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.salePrice * item.quantity,
        0
      );

      // Staff không cần gửi branchId - backend tự inject từ token
      // Admin bắt buộc phải gửi branchId
      const receiptData: CreateReceiptRequest = {
        ...(isAdmin && { branchId: selectedBranch }),
        listProduct: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          salePrice: item.salePrice,
        })),
        totalAmount,
        paymentMethod,
      };

      const response = await receiptService.create(receiptData);

      if (response.success && response.data) {
        // If transfer payment, show QR dialog
        if (paymentMethod === "transfer" && response.data.paymentInfo?.qrCode) {
          setPaymentData(response.data);
          setShowQRDialog(true);
          toast.success(
            "Tạo hóa đơn thành công! Vui lòng quét mã QR để thanh toán."
          );
          setCartItems([]);
        } else {
          toast.success("Tạo hóa đơn thành công!");
          setCartItems([]);
          router.push(ROUTES.INVOICES);
        }
      } else {
        toast.error(response.message || "Tạo hóa đơn thất bại");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi tạo hóa đơn");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBranch, cartItems, paymentMethod, isAdmin]);

  // Keyboard shortcuts - F9 to submit directly
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9" && cartItems.length > 0 && !isSubmitting) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems.length, isSubmitting, handleSubmit]);

  return (
    <div className="flex flex-col h-full p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.INVOICES)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Tạo hóa đơn mới</h1>
          <p className="text-sm text-muted-foreground">
            Quét barcode hoặc tìm kiếm sản phẩm để thêm vào giỏ hàng
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Section */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <SmartProductInput
              onProductSelect={handleProductSelect}
              searchFn={handleSearch}
              getByBarcodeFn={getProductByBarcode}
              placeholder="Quét mã barcode hoặc nhập tên sản phẩm..."
              autoFocus
            />
          </div>

          {/* Cart Table */}
          <CartItemsTable
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onClearAll={clearCart}
          />
        </div>

        {/* Right Panel - Payment Summary */}
        <div className="lg:w-96 lg:flex-shrink-0">
          <PaymentSummary
            items={cartItems}
            branches={branches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            isAdmin={isAdmin}
            onSubmit={handleSubmit}
            disabled={cartItems.length === 0 || !selectedBranch}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Payment QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              Thanh toán chuyển khoản
            </DialogTitle>
            <DialogDescription className="text-center">
              Mở app ngân hàng và quét mã QR bên dưới
            </DialogDescription>
          </DialogHeader>
          {paymentData && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* VietQR - Direct bank app scanning */}
              {paymentData.paymentInfo?.qrCode ? (
                <div className="p-3 bg-white rounded-xl border-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentData.paymentInfo.qrCode}
                    alt="QR Thanh toán"
                    className="w-56 h-56 object-contain"
                    onError={(e) => {
                      // Fallback: regenerate QR from saved info
                      const info = paymentData.paymentInfo;
                      if (info?.bin && info?.accountNumber && info?.amount) {
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
                </div>
              ) : paymentData.paymentInfo?.bin &&
                paymentData.paymentInfo?.accountNumber ? (
                <div className="p-3 bg-white rounded-xl border-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.vietqr.io/image/${
                      paymentData.paymentInfo.bin
                    }-${
                      paymentData.paymentInfo.accountNumber
                    }-compact2.png?amount=${
                      paymentData.paymentInfo.amount || paymentData.totalAmount
                    }&addInfo=${encodeURIComponent(
                      paymentData.paymentInfo.description || paymentData.code
                    )}&accountName=${encodeURIComponent(
                      paymentData.paymentInfo.accountName || ""
                    )}`}
                    alt="QR Thanh toán"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              ) : (
                <div className="p-4 bg-white rounded-lg border">
                  <QRCodeSVG
                    value={paymentData.paymentInfo?.checkoutUrl || ""}
                    size={220}
                    level="H"
                    includeMargin
                  />
                </div>
              )}

              {/* Bank account info */}
              {paymentData.paymentInfo?.accountNumber && (
                <div className="w-full p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngân hàng:</span>
                    <span className="font-medium">
                      {paymentData.paymentInfo.accountName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số TK:</span>
                    <span className="font-mono font-medium">
                      {paymentData.paymentInfo.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nội dung:</span>
                    <span className="font-medium">
                      {paymentData.paymentInfo.description}
                    </span>
                  </div>
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="font-medium">
                  Mã hóa đơn:{" "}
                  <span className="text-primary">{paymentData.code}</span>
                </p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(paymentData.totalAmount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Trạng thái:{" "}
                  <Badge
                    variant={
                      paymentData.paymentInfo?.status === "paid"
                        ? "default"
                        : paymentData.paymentInfo?.status === "expired"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {paymentData.paymentInfo?.status === "pending"
                      ? "Chờ thanh toán"
                      : paymentData.paymentInfo?.status === "paid"
                      ? "Đã thanh toán"
                      : paymentData.paymentInfo?.status === "expired"
                      ? "Hết hạn"
                      : paymentData.paymentInfo?.status === "cancelled"
                      ? "Đã hủy"
                      : paymentData.paymentInfo?.status}
                  </Badge>
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                💡 Mở ứng dụng ngân hàng bất kỳ → Quét QR → Xác nhận thanh toán
              </p>

              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQRDialog(false);
                    setPaymentData(null);
                  }}
                >
                  Đóng
                </Button>
                <Button onClick={() => router.push(ROUTES.INVOICES)}>
                  Về danh sách hóa đơn
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
