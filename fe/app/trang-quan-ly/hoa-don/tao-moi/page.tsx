"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import productService, { Product } from "@/service/product.service";
import receiptService, { CreateReceiptRequest } from "@/service/receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";
import {
  BarcodeScanner,
  ProductSearch,
  CartItemsTable,
  PaymentSummary,
  ConfirmDialog,
  CartItem,
} from "@/components/receipt";

export default function CreateReceiptPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("");
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "card" | "transfer">("cash");
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  // Handle product select from search
  const handleProductSelect = React.useCallback(
    (product: Product) => {
      const existingItem = cartItems.find((item) => item.productId === product._id);

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
      setCartItems((prev) => prev.filter((item) => item.productId !== productId));
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

  // Submit
  const handleSubmit = async () => {
    if (!selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.salePrice * item.quantity,
        0
      );

      const receiptData: CreateReceiptRequest = {
        branchId: selectedBranch,
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

      if (response.success) {
        toast.success("Tạo hóa đơn thành công!");
        setCartItems([]);
        setShowConfirmDialog(false);
      } else {
        toast.error(response.message || "Tạo hóa đơn thất bại");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi tạo hóa đơn");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9" && cartItems.length > 0) {
        e.preventDefault();
        setShowConfirmDialog(true);
      }
      if (e.key === "Escape") {
        setShowConfirmDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems.length]);

  return (
    <div className="flex flex-col h-full p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(ROUTES.INVOICES)}>
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
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Section */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
            <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />
            <ProductSearch onProductSelect={handleProductSelect} searchFn={handleSearch} />
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
        <PaymentSummary
          items={cartItems}
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          isAdmin={isAdmin}
          onSubmit={() => setShowConfirmDialog(true)}
          disabled={cartItems.length === 0 || !selectedBranch}
        />
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        items={cartItems}
        paymentMethod={paymentMethod}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
