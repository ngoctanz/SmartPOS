import * as React from "react";
import { toast } from "sonner";
import productService from "@/service/product.service";
import receiptService from "@/service/receipt.service";
import { CartItem } from "@/components/receipt";

interface UseErrorReceiptLoaderOptions {
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setPaymentMethod: React.Dispatch<React.SetStateAction<"cash" | "transfer">>;
}

/**
 * Hook to load cart items from an error receipt (via ?fromError=CODE query param)
 */
export function useErrorReceiptLoader({
  setCartItems,
  setPaymentMethod,
}: UseErrorReceiptLoaderOptions) {
  React.useEffect(() => {
    const loadFromError = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorCode = params.get("fromError");

      if (!errorCode) return;

      try {
        const response = await receiptService.getByCode(errorCode);
        if (!response.success || !response.data) return;

        const errorReceipt = response.data;

        if (!errorReceipt.isError) {
          toast.error("Hóa đơn này không phải hóa đơn lỗi");
          return;
        }

        const items: CartItem[] = [];
        const deletedProducts: string[] = [];

        await Promise.all(
          errorReceipt.listProduct.map(async (p) => {
            try {
              const productResponse = await productService.getById(p.productId);
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
                deletedProducts.push(p.productName);
              }
            } catch {
              deletedProducts.push(p.productName);
            }
          })
        );

        setCartItems(items);

        if (
          errorReceipt.paymentMethod === "cash" ||
          errorReceipt.paymentMethod === "transfer"
        ) {
          setPaymentMethod(errorReceipt.paymentMethod);
        }

        // Show appropriate toast message
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
            `Đã tải ${items.length} sản phẩm. ${
              deletedProducts.length
            } sản phẩm đã bị xóa: ${deletedProducts.join(", ")}`,
            { duration: 7000 }
          );
        } else if (items.length === 0 && deletedProducts.length > 0) {
          toast.error(
            `Không thể tải sản phẩm. Tất cả ${deletedProducts.length} sản phẩm trong hóa đơn đã bị xóa khỏi hệ thống.`,
            { duration: 5000 }
          );
        }
      } catch (error) {
        console.error("Failed to load error receipt:", error);
        toast.error("Không thể tải hóa đơn lỗi");
      }
    };

    loadFromError();
  }, [setCartItems, setPaymentMethod]);
}
