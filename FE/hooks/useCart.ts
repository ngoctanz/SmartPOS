import * as React from "react";
import { toast } from "sonner";
import { Product } from "@/service/product.service";
import { CartItem } from "@/components/receipt";

interface UseCartReturn {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addProduct: (product: Product) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalAmount: number;
}

export function useCart(): UseCartReturn {
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);

  const addProduct = React.useCallback((product: Product) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.productId === product._id);

      if (existingItem) {
        // Toast outside setState to avoid side effects during render
        setTimeout(() => toast.success(`+1 ${product.name}`), 0);
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        const price = product.salePrice ?? product.currentSalePrice;

        // Toast outside setState to avoid side effects during render
        setTimeout(() => {
          if (!product.stock || product.stock <= 0) {
            toast.warning(`Đã thêm: ${product.name}`, {
              description: "⚠️ Sản phẩm này chưa có trong kho chi nhánh",
            });
          } else {
            toast.success(`Đã thêm: ${product.name}`);
          }
        }, 0);

        return [
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
        ];
      }
    });
  }, []); // No dependencies needed - uses functional update

  const updateQuantity = React.useCallback(
    (productId: string, newQuantity: number) => {
      if (newQuantity < 1) {
        setCartItems((prev) =>
          prev.filter((item) => item.productId !== productId)
        );
        return;
      }
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    },
    []
  );

  const removeItem = React.useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = React.useCallback(() => {
    setCartItems([]);
  }, []);

  const totalAmount = React.useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0),
    [cartItems]
  );

  return {
    cartItems,
    setCartItems,
    addProduct,
    updateQuantity,
    removeItem,
    clearCart,
    totalAmount,
  };
}
