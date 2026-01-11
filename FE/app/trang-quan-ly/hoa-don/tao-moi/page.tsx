"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import productService, { Product } from "@/service/product.service";
import receiptService, {
  CreateReceiptRequest,
  QRPreviewResponse,
} from "@/service/receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";
import { CartItemsTable, PaymentSummary, CartItem, QRPreviewDialog } from "@/components/receipt";
import { SmartProductInput } from "@/components/common/smart-product-input";
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
  const [customerPaid, setCustomerPaid] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // QR Preview state (for transfer payment)
  const [showQRPreview, setShowQRPreview] = React.useState(false);
  const [qrPreviewData, setQrPreviewData] = React.useState<QRPreviewResponse | null>(null);
  const [isCreatingPreview, setIsCreatingPreview] = React.useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = React.useState(false);
  const [qrCooldown, setQrCooldown] = React.useState(false); 

  // Real-time payment notifications via WebSocket
  useSocket({
    onPaymentSuccess: (data) => {
      toast.success(
        `Đơn hàng ${data.receiptCode} đã thanh toán thành công: ${formatCurrency(data.amount)}`,
        { duration: 5000, position: "top-right" }
      );
      // If payment was made from QR preview (draft receipt paid directly)
      if (showQRPreview && qrPreviewData?.receiptCode === data.receiptCode) {
        setShowQRPreview(false);
        setQrPreviewData(null);
        setCartItems([]);
        toast.info("Khách đã thanh toán! Chuyển đến trang chi tiết...");
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
        
        // Thông báo nếu sản phẩm không có trong kho (stock = 0 hoặc undefined)
        if (!product.stock || product.stock <= 0) {
          toast.warning(`Đã thêm: ${product.name}`, {
            description: "⚠️ Sản phẩm này chưa có trong kho chi nhánh",
          });
        } else {
          toast.success(`Đã thêm: ${product.name}`);
        }
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

    // For transfer payment, show QR preview first
    if (paymentMethod === "transfer") {
      await handleCreateQRPreview();
      return;
    }

    // For cash payment, create receipt directly
    await createReceipt();
  }, [selectedBranch, cartItems, paymentMethod, isAdmin]);

  // Create QR preview for transfer payment
  const handleCreateQRPreview = React.useCallback(async () => {
    if (isAdmin && !selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    // Check cooldown to prevent spam
    if (qrCooldown) {
      toast.warning("Vui lòng đợi vài giây trước khi tạo mã QR mới");
      return;
    }

    setIsCreatingPreview(true);
    try {
      const response = await receiptService.createQRPreview({
        ...(isAdmin && { branchId: selectedBranch }),
        listProduct: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          salePrice: item.salePrice,
        })),
      });

      if (response.success && response.data) {
        setQrPreviewData(response.data);
        setShowQRPreview(true);
        
        // Set cooldown for 3 seconds after creating QR
        setQrCooldown(true);
        setTimeout(() => setQrCooldown(false), 3000);
      } else {
        toast.error(response.message || "Không thể tạo mã QR");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi tạo mã QR");
    } finally {
      setIsCreatingPreview(false);
    }
  }, [selectedBranch, cartItems, isAdmin, qrCooldown]);

  // Handle back from QR preview (cancel preview and return to cart)
  const handleBackFromPreview = React.useCallback(async () => {
    if (qrPreviewData?.orderCode) {
      // Cancel the preview in background (don't wait)
      receiptService.cancelQRPreview(qrPreviewData.orderCode).catch(() => {});
    }
    setShowQRPreview(false);
    setQrPreviewData(null);
  }, [qrPreviewData]);

  // Confirm and complete - move draft to pending and go to list
  const handleConfirmFromPreview = React.useCallback(async () => {
    if (!qrPreviewData) return;

    setIsConfirmingReceipt(true);
    try {
      // Call confirmQRPreview to update draft -> pending
      const response = await receiptService.confirmQRPreview(qrPreviewData.orderCode);

      if (response.success && response.data) {
        setShowQRPreview(false);
        setQrPreviewData(null);
        setCartItems([]);
        
        toast.success("Đã lưu hóa đơn vào danh sách chờ thanh toán");
        router.push(ROUTES.INVOICES);
      } else {
        toast.error(response.message || "Lưu hóa đơn thất bại");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi lưu hóa đơn");
    } finally {
      setIsConfirmingReceipt(false);
    }
  }, [qrPreviewData, router]);

  // Create receipt directly (for cash payment)
  const createReceipt = React.useCallback(async () => {
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
        // Chỉ gửi customerPaid khi thanh toán tiền mặt và có nhập
        ...(paymentMethod === "cash" && customerPaid && { customerPaid }),
      };

      const response = await receiptService.create(receiptData);

      if (response.success && response.data) {
        toast.success("Tạo hóa đơn thành công!");
        setCartItems([]);
        setCustomerPaid(null); // Reset customerPaid
        router.push(ROUTES.INVOICES);
      } else {
        toast.error(response.message || "Tạo hóa đơn thất bại");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi tạo hóa đơn");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBranch, cartItems, paymentMethod, customerPaid, isAdmin, router]);

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
            isCreatingPreview={isCreatingPreview}
            customerPaid={customerPaid}
            onCustomerPaidChange={setCustomerPaid}
          />
        </div>
      </div>

      {/* QR Preview Dialog - For transfer payment flow */}
      <QRPreviewDialog
        open={showQRPreview}
        onOpenChange={setShowQRPreview}
        previewData={qrPreviewData}
        onBack={handleBackFromPreview}
        onConfirm={handleConfirmFromPreview}
        isConfirming={isConfirmingReceipt}
        itemCount={cartItems.length}
        totalQuantity={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
      />
    </div>
  );
}
