"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search, Package, Loader2 } from "lucide-react";
import { Product } from "@/service/product.service";
import { formatCurrency } from "@/utils/format.utils";

interface ProductSearchProps {
  onProductSelect: (product: Product) => void;
  searchFn: (term: string) => Promise<Product[]>;
  placeholder?: string;
}

export function ProductSearch({
  onProductSelect,
  searchFn,
  placeholder = "Tìm sản phẩm theo tên...",
}: ProductSearchProps) {
  const [searchInput, setSearchInput] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Product[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  React.useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchFn(searchInput);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchFn]);

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    setSearchInput("");
    setSearchResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={placeholder}
          className="pl-10 h-11 bg-background"
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {searchResults.map((product) => (
            <div
              key={product._id}
              className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors border-b last:border-b-0"
              onClick={() => handleSelect(product)}
            >
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.barcode || "Không có mã"} • {product.unit}
                </p>
              </div>
              <span className="text-sm font-medium text-primary">
                {formatCurrency(product.currentSalePrice)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
