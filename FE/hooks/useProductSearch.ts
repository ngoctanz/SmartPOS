import * as React from "react";
import productService, { Product } from "@/service/product.service";

interface UseProductSearchOptions {
  branchId?: string;
  isAdmin: boolean;
}

interface UseProductSearchReturn {
  searchProducts: (term: string) => Promise<Product[]>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
}

/**
 * Hook for product search and barcode lookup
 */
export function useProductSearch({
  branchId,
  isAdmin,
}: UseProductSearchOptions): UseProductSearchReturn {
  const searchProducts = React.useCallback(
    async (term: string): Promise<Product[]> => {
      const searchBranchId = isAdmin && branchId ? branchId : undefined;
      const response = await productService.search({
        name: term,
        branchId: searchBranchId,
      });
      return response.success && response.data ? response.data : [];
    },
    [branchId, isAdmin]
  );

  const getProductByBarcode = React.useCallback(
    async (barcode: string): Promise<Product | null> => {
      try {
        // Admin: truyền branchId nếu có
        // Staff/Manager: không truyền, BE middleware sẽ tự inject
        const searchBranchId = isAdmin && branchId ? branchId : undefined;
        const response = await productService.getByBarcode(
          barcode,
          searchBranchId
        );
        return response.success && response.data ? response.data : null;
      } catch {
        return null;
      }
    },
    [branchId, isAdmin]
  );

  return {
    searchProducts,
    getProductByBarcode,
  };
}
