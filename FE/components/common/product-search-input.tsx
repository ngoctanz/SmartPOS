"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search, X } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import productService, { Product } from "@/service/product.service";
import { cn } from "@/lib/utils";

interface ProductSearchInputProps {
  onSelect: (product: Product) => void;
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function ProductSearchInput({
  onSelect,
  excludeIds = [],
  placeholder = "Tìm sản phẩm theo tên hoặc barcode...",
  disabled = false,
}: ProductSearchInputProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Search products when debounced term changes
  React.useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.trim().length < 1) {
        setResults([]);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await productService.search({
          name: debouncedSearchTerm.trim(),
        });

        if (response.data) {
          // Filter out already selected products
          const filtered = response.data.filter(
            (product) => !excludeIds.includes(product._id)
          );
          setResults(filtered);

          if (filtered.length === 0 && response.data.length === 0) {
            setError("Không tìm thấy sản phẩm");
          }
        }
      } catch (err) {
        console.error("Search failed:", err);
        setError("Lỗi tìm kiếm");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchProducts();
  }, [debouncedSearchTerm, excludeIds]);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setSearchTerm("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setSearchTerm("");
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && searchTerm && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Đang tìm kiếm...
              </span>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              {/* TODO: Add "Create new product" button here in future */}
            </div>
          )}

          {/* Results */}
          {!isLoading && !error && results.length > 0 && (
            <ul className="max-h-[300px] overflow-y-auto py-1">
              {results.map((product) => (
                <li key={product._id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2 text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full rounded-md object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {product.barcode && (
                          <span>Barcode: {product.barcode}</span>
                        )}
                        <span>•</span>
                        <span>{formatPrice(product.currentSalePrice)}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* No Results (but search succeeded) */}
          {!isLoading &&
            !error &&
            results.length === 0 &&
            debouncedSearchTerm && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Tất cả sản phẩm tìm được đã được thêm vào danh sách
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
