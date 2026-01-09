"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { ScanLine, Package, Loader2, X, AlertCircle } from "lucide-react";
import { Product } from "@/service/product.service";
import { formatCurrency } from "@/utils/format.utils";
import { cn } from "@/lib/utils";

interface SmartProductInputProps {
  onProductSelect: (product: Product) => void;
  searchFn: (term: string) => Promise<Product[]>;
  getByBarcodeFn: (barcode: string) => Promise<Product | null>;
  placeholder?: string;
  autoFocus?: boolean;
  /** Callback when barcode not found - if provided, error message won't be shown */
  onBarcodeNotFound?: (barcode: string) => void;
  /** If true, disables auto-refocus behavior (useful when editing prices/quantities) */
  disableAutoRefocus?: boolean;
}

export function SmartProductInput({
  onProductSelect,
  searchFn,
  getByBarcodeFn,
  placeholder = "Quét mã barcode hoặc nhập tên sản phẩm...",
  autoFocus = true,
  onBarcodeNotFound,
  disableAutoRefocus = false,
}: SmartProductInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Product[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const keystrokeTimesRef = React.useRef<number[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Auto focus on mount and when window gains focus
  React.useEffect(() => {
    if (!autoFocus) return;

    const focusInput = () => {
      // Delay to ensure other elements don't steal focus
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    focusInput();

    // Only add window focus listener if auto-refocus is enabled
    if (!disableAutoRefocus) {
      window.addEventListener("focus", focusInput);
    }

    // Refocus periodically to ensure always focused (only if not disabled)
    const interval = disableAutoRefocus
      ? null
      : setInterval(() => {
          if (document.activeElement !== inputRef.current && !showDropdown) {
            inputRef.current?.focus();
          }
        }, 1000);

    return () => {
      if (!disableAutoRefocus) {
        window.removeEventListener("focus", focusInput);
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoFocus, showDropdown, disableAutoRefocus]);

  // Check if input looks like a barcode (all digits, >= 8 chars)
  const looksLikeBarcode = React.useCallback((value: string) => {
    return /^\d{8,}$/.test(value.trim());
  }, []);

  // Detect scanner input (rapid keystrokes)
  const isFromScanner = React.useCallback(() => {
    const times = keystrokeTimesRef.current;
    if (times.length < 3) return false;
    const avgInterval =
      (times[times.length - 1] - times[0]) / (times.length - 1);
    return avgInterval < 50; // Scanner typically < 50ms between keystrokes
  }, []);

  // Process barcode - call API to get product
  const processBarcode = React.useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) return;

      setIsSearching(true);
      setErrorMessage(null);
      setShowDropdown(false);

      try {
        const product = await getByBarcodeFn(barcode.trim());
        if (product) {
          onProductSelect(product);
          setInputValue("");
        } else {
          // If callback provided, call it instead of showing error
          if (onBarcodeNotFound) {
            onBarcodeNotFound(barcode.trim());
            setInputValue("");
          } else {
            setErrorMessage(
              `Sản phẩm với mã "${barcode}" chưa có trong hệ thống`
            );
            setTimeout(() => setErrorMessage(null), 3000);
          }
        }
      } catch {
        if (onBarcodeNotFound) {
          onBarcodeNotFound(barcode.trim());
          setInputValue("");
        } else {
          setErrorMessage(
            `Sản phẩm với mã "${barcode}" chưa có trong hệ thống`
          );
          setTimeout(() => setErrorMessage(null), 3000);
        }
      } finally {
        setIsSearching(false);
        inputRef.current?.focus();
      }
    },
    [getByBarcodeFn, onProductSelect, onBarcodeNotFound]
  );

  // Search products by name
  const searchProducts = React.useCallback(
    async (term: string) => {
      if (!term.trim() || term.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchFn(term);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    },
    [searchFn]
  );

  // Debounced search
  React.useEffect(() => {
    if (!inputValue.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // If input is >= 5 characters, check if it's an exact barcode match first
    if (inputValue.trim().length >= 5) {
      const timer = setTimeout(async () => {
        // Try exact barcode match first
        try {
          const product = await getByBarcodeFn(inputValue.trim());
          if (product) {
            // Exact match found - auto add
            onProductSelect(product);
            setInputValue("");
            setSearchResults([]);
            setShowDropdown(false);
            return;
          }
        } catch {
          // Not found, continue with search
        }

        // If not exact barcode match, search by name
        if (!looksLikeBarcode(inputValue)) {
          searchProducts(inputValue);
        }
      }, 400);

      return () => clearTimeout(timer);
    }

    // For shorter inputs, only search if it's not a barcode pattern
    if (!looksLikeBarcode(inputValue)) {
      const timer = setTimeout(() => {
        searchProducts(inputValue);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [
    inputValue,
    searchProducts,
    looksLikeBarcode,
    getByBarcodeFn,
    onProductSelect,
  ]);

  // Handle keydown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();

    // Track keystroke timing for scanner detection
    if (e.key.length === 1) {
      keystrokeTimesRef.current.push(now);
      if (keystrokeTimesRef.current.length > 5) {
        keystrokeTimesRef.current.shift();
      }
    }

    // Arrow navigation in dropdown
    if (showDropdown && searchResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        setSelectedIndex(-1);
        return;
      }
    }

    // Enter key
    if (e.key === "Enter") {
      e.preventDefault();

      // If dropdown is open and item is selected, select that item
      if (showDropdown && selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleSelectProduct(searchResults[selectedIndex]);
        return;
      }

      // If input looks like barcode, process it
      if (inputValue.trim() && looksLikeBarcode(inputValue)) {
        processBarcode(inputValue);
        return;
      }

      // If scanner input (rapid typing), process as barcode
      if (inputValue.trim() && isFromScanner()) {
        processBarcode(inputValue);
        return;
      }

      // Otherwise, if dropdown has results, select first one
      if (showDropdown && searchResults.length > 0) {
        handleSelectProduct(searchResults[0]);
      }
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setErrorMessage(null);

    // Auto-detect scanner input and process barcode
    if (isFromScanner() && value.length >= 8) {
      // Scanner detected, wait a bit then process
      setTimeout(() => {
        if (inputRef.current?.value === value) {
          processBarcode(value);
        }
      }, 150);
    }
  };

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    onProductSelect(product);
    setInputValue("");
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle clear input
  const handleClear = () => {
    setInputValue("");
    setSearchResults([]);
    setShowDropdown(false);
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  // Click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0 && inputValue.trim()) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-10 h-12 bg-background text-base",
            errorMessage && "border-destructive focus-visible:ring-destructive"
          )}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search results dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-72 overflow-y-auto"
        >
          {searchResults.map((product, index) => (
            <div
              key={product._id}
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0",
                index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
              )}
              onClick={() => handleSelectProduct(product)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.barcode || "Không có mã"} • {product.unit}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(product.salePrice ?? product.currentSalePrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hint text */}
      <p className="text-xs text-muted-foreground mt-2">
        💡 Nhập từ 5 ký tự để tìm kiếm. Nếu trùng khớp barcode sẽ tự động thêm.
        Nhấn{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> để
        xác nhận.
      </p>
    </div>
  );
}
