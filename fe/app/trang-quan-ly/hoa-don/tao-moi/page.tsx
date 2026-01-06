"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Barcode,
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  Banknote,
  Building2,
  ArrowLeft,
  Loader2,
  ScanBarcode,
} from "lucide-react";
import productService, { Product } from "@/service/product.service";
import receiptService, {
  CreateReceiptRequest,
} from "@/service/receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";

interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  salePrice: number;
  unit: string;
  image?: string;
}

export default function CreateReceiptPage() {
  const router = useRouter();
  const { user } = useAuthContext();

  // State
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("");
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Product[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [lastScannedTime, setLastScannedTime] = React.useState(0);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const barcodeBufferRef = React.useRef<string>("");
  const lastKeyTimeRef = React.useRef<number>(0);

  // Load branches on mount
  React.useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll();
        if (response.success && response.data) {
          setBranches(response.data);
          // Auto-select user's branch if available
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

  // Focus barcode input on mount
  // Focus barcode input on mount
  React.useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0
  );
  const totalAmount = subtotal; // Can add discount logic here later

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Process barcode - add product to cart
  const processBarcode = React.useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) return;

      try {
        // Check if product already in cart
        const existingItem = cartItems.find((item) => item.barcode === barcode);

        if (existingItem) {
          // Increase quantity if already in cart
          setCartItems((prev) =>
            prev.map((item) =>
              item.barcode === barcode
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          );
          toast.success(`Đã tăng số lượng: ${existingItem.productName}`);
        } else {
          // Search product by barcode
          const response = await productService.getByBarcode(barcode);

          if (response.success && response.data) {
            const product = response.data;
            const newItem: CartItem = {
              productId: product._id,
              productName: product.name,
              barcode: product.barcode || barcode,
              quantity: 1,
              salePrice: product.currentSalePrice,
              unit: product.unit,
              image: product.image,
            };
            setCartItems((prev) => [...prev, newItem]);
            toast.success(`Đã thêm: ${product.name}`);
          } else {
            toast.error("Không tìm thấy sản phẩm với mã barcode này");
          }
        }
      } catch (error) {
        const err = error as Error;
        toast.error(err.message || "Không tìm thấy sản phẩm");
      }

      // Clear input and refocus
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
    },
    [cartItems]
  );

  // Handle barcode input - detect scanner input (rapid keystrokes)
  const handleBarcodeKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key - process immediately
      if (e.key === "Enter") {
        e.preventDefault();
        const barcode = barcodeBufferRef.current || barcodeInput;
        if (barcode.trim()) {
          processBarcode(barcode.trim());
          barcodeBufferRef.current = "";
        }
        return;
      }

      // If typing is fast (< 50ms between keys), it's likely a scanner
      if (timeDiff < 50 && e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      } else if (e.key.length === 1) {
        // Reset buffer for manual typing
        barcodeBufferRef.current = e.key;
      }
    },
    [barcodeInput, processBarcode]
  );

  // Auto-submit barcode after scanner finishes (no input for 100ms)
  React.useEffect(() => {
    if (!barcodeInput.trim()) return;

    const timer = setTimeout(() => {
      // Check if input looks like a complete barcode (usually 8-13 digits)
      const barcode = barcodeInput.trim();
      if (barcode.length >= 8 && /^[0-9]+$/.test(barcode)) {
        processBarcode(barcode);
      }
    }, 150); // Wait 150ms after last input

    return () => clearTimeout(timer);
  }, [barcodeInput, processBarcode]);

  // Handle manual form submit
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const barcode = barcodeInput.trim();
    if (!barcode) return;

    // Debounce for barcode scanner (rapid inputs)
    const now = Date.now();
    if (now - lastScannedTime < 100) {
      return;
    }
    setLastScannedTime(now);

    await processBarcode(barcode);
  };

  // Handle product search
  const handleSearch = React.useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await productService.search({ name: term });
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch {
      toast.error("Lỗi tìm kiếm sản phẩm");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim()) {
        handleSearch(searchInput);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, handleSearch]);

  // Add product from search results
  const addProductFromSearch = (product: Product) => {
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
      toast.success(`Đã tăng số lượng: ${product.name}`);
    } else {
      const newItem: CartItem = {
        productId: product._id,
        productName: product.name,
        barcode: product.barcode || "",
        quantity: 1,
        salePrice: product.currentSalePrice,
        unit: product.unit,
        image: product.image,
      };
      setCartItems((prev) => [...prev, newItem]);
      toast.success(`Đã thêm: ${product.name}`);
    }

    setSearchInput("");
    setSearchResults([]);
    barcodeInputRef.current?.focus();
  };

  // Update quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item from cart
  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
    toast.info("Đã xóa sản phẩm khỏi giỏ hàng");
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    toast.info("Đã xóa toàn bộ giỏ hàng");
  };

  // Submit receipt
  const handleSubmit = async () => {
    if (!selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    setIsSubmitting(true);
    try {
      const receiptData: CreateReceiptRequest = {
        branchId: selectedBranch,
        listProduct: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          salePrice: item.salePrice,
        })),
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
      };

      const response = await receiptService.create(receiptData);

      if (response.success) {
        toast.success("Tạo hóa đơn thành công!");
        setCartItems([]);
        setShowConfirmDialog(false);
        // Optional: redirect to receipt detail or stay for next receipt
        // router.push(ROUTES.INVOICES);
      } else {
        toast.error(response.message || "Tạo hóa đơn thất bại");
      }
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Lỗi tạo hóa đơn");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus barcode input
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      // F3: Focus search input
      if (e.key === "F3") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F9: Submit (open confirm dialog)
      if (e.key === "F9" && cartItems.length > 0) {
        e.preventDefault();
        setShowConfirmDialog(true);
      }
      // Escape: Close dialogs or clear input
      if (e.key === "Escape") {
        setShowConfirmDialog(false);
        setSearchResults([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems.length]);

  return (
    <div className="flex flex-col h-full gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(ROUTES.INVOICES)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Tạo hóa đơn mới</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>F2: Barcode</span>
          <span>|</span>
          <span>F3: Tìm kiếm</span>
          <span>|</span>
          <span>F9: Thanh toán</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Left: Product Search & Barcode Input */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Barcode Scanner Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ScanBarcode className="h-5 w-5" />
                Quét mã barcode
              </CardTitle>
              <CardDescription>
                Quét mã barcode để tự động thêm sản phẩm. Quét lại để tăng số
                lượng.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={barcodeInputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Quét hoặc nhập mã barcode..."
                    className="pl-10 text-lg h-12 font-mono"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <Button type="submit" size="lg" className="h-12">
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Tìm kiếm sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã barcode..."
                  className="pl-10"
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 border rounded-lg max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                      onClick={() => addProductFromSearch(product)}
                    >
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Barcode className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.barcode || "N/A"} • {product.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {formatCurrency(product.currentSalePrice)}
                        </p>
                        <Button size="sm" variant="ghost">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart Items Table */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Giỏ hàng ({cartItems.length} sản phẩm)
                </CardTitle>
                {cartItems.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa tất cả
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-4" />
                  <p>Giỏ hàng trống</p>
                  <p className="text-sm">
                    Quét barcode hoặc tìm kiếm để thêm sản phẩm
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">STT</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-center w-[150px]">
                          Số lượng
                        </TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item, index) => (
                        <TableRow key={item.productId}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.barcode} • {item.unit}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.salePrice)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity - 1
                                  )
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(
                                    item.productId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-16 text-center h-8"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity + 1
                                  )
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.salePrice * item.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Payment Summary */}
        <div className="flex flex-col gap-4">
          {/* Branch Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Chi nhánh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chi nhánh" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Tiền mặt
              </Button>
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Thẻ
              </Button>
              <Button
                variant={paymentMethod === "transfer" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPaymentMethod("transfer")}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Chuyển khoản
              </Button>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle>Tổng cộng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Giảm giá:</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Tổng tiền:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-12 text-lg"
                size="lg"
                disabled={cartItems.length === 0 || !selectedBranch}
                onClick={() => setShowConfirmDialog(true)}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Thanh toán (F9)
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận thanh toán</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Số sản phẩm:</span>
                    <span className="font-medium">{cartItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng số lượng:</span>
                    <span className="font-medium">
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phương thức:</span>
                    <Badge variant="outline">
                      {paymentMethod === "cash"
                        ? "Tiền mặt"
                        : paymentMethod === "card"
                        ? "Thẻ"
                        : "Chuyển khoản"}
                    </Badge>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Tổng tiền:</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
