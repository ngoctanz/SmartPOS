"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, Package, Loader2, X, AlertCircle, Search } from "lucide-react";
import { Product } from "@/service/product.service";
import { formatCurrency } from "@/utils/format.utils";
import { cn } from "@/lib/utils";

interface SmartProductInputMobileProps {
  onProductSelect: (product: Product) => void;
  searchFn: (term: string) => Promise<Product[]>;
  getByBarcodeFn: (barcode: string) => Promise<Product | null>;
  placeholder?: string;
  onBarcodeNotFound?: (barcode: string) => void;
}

export function SmartProductInputMobile({
  onProductSelect,
  searchFn,
  getByBarcodeFn,
  placeholder = "Quét mã barcode hoặc tìm kiếm...",
  onBarcodeNotFound,
}: SmartProductInputMobileProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Product[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const keystrokeTimesRef = React.useRef<number[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const justProcessedRef = React.useRef(false);
  const lastProcessTimeRef = React.useRef(0);
  const PROCESS_BLOCK_TIME = 500;

  const looksLikeBarcode = React.useCallback((value: string) => {
    return /^\d{8,}$/.test(value.trim());
  }, []);

  const isFromScanner = React.useCallback(() => {
    const times = keystrokeTimesRef.current;
    if (times.length < 3) return false;
    const avgInterval = (times[times.length - 1] - times[0]) / (times.length - 1);
    return avgInterval < 50;
  }, []);

  const processBarcode = React.useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) return;

      justProcessedRef.current = true;
      lastProcessTimeRef.current = Date.now();

      setIsSearching(true);
      setErrorMessage(null);
      setShowDropdown(false);

      try {
        const product = await getByBarcodeFn(barcode.trim());
        if (product) {
          onProductSelect(product);
          setInputValue("");
        } else {
          if (onBarcodeNotFound) {
            onBarcodeNotFound(barcode.trim());
            setInputValue("");
          } else {
            setErrorMessage(`Sản phẩm với mã "${barcode}" chưa có trong hệ thống`);
            setTimeout(() => setErrorMessage(null), 3000);
          }
        }
      } catch {
        if (onBarcodeNotFound) {
          onBarcodeNotFound(barcode.trim());
          setInputValue("");
        } else {
          setErrorMessage(`Sản phẩm với mã "${barcode}" chưa có trong hệ thống`);
          setTimeout(() => setErrorMessage(null), 3000);
        }
      } finally {
        setIsSearching(false);
        setTimeout(() => {
          justProcessedRef.current = false;
        }, PROCESS_BLOCK_TIME);
      }
    },
    [getByBarcodeFn, onProductSelect, onBarcodeNotFound, PROCESS_BLOCK_TIME]
  );

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
      } catch {
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    },
    [searchFn]
  );

  React.useEffect(() => {
    if (!inputValue.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (inputValue.trim().length >= 5) {
      const timer = setTimeout(async () => {
        try {
          const product = await getByBarcodeFn(inputValue.trim());
          if (product) {
            onProductSelect(product);
            setInputValue("");
            setSearchResults([]);
            setShowDropdown(false);
            return;
          }
        } catch {}

        if (!looksLikeBarcode(inputValue)) {
          searchProducts(inputValue);
        }
      }, 400);

      return () => clearTimeout(timer);
    }

    if (!looksLikeBarcode(inputValue)) {
      const timer = setTimeout(() => {
        searchProducts(inputValue);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [inputValue, searchProducts, looksLikeBarcode, getByBarcodeFn, onProductSelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();

    if (e.key.length === 1) {
      keystrokeTimesRef.current.push(now);
      if (keystrokeTimesRef.current.length > 5) {
        keystrokeTimesRef.current.shift();
      }
    }

    if (e.key === "Enter") {
      const timeSinceLastProcess = now - lastProcessTimeRef.current;
      
      if (justProcessedRef.current || timeSinceLastProcess < PROCESS_BLOCK_TIME) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      const hasValue = inputValue.trim().length > 0;
      
      if (hasValue) {
        e.preventDefault();
        e.stopPropagation();

        if (looksLikeBarcode(inputValue) || isFromScanner()) {
          processBarcode(inputValue);
          return;
        }

        if (showDropdown && searchResults.length > 0) {
          handleSelectProduct(searchResults[0]);
        }
      }
    }

    if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setErrorMessage(null);

    if (isFromScanner() && value.length >= 8 && looksLikeBarcode(value)) {
      setTimeout(() => {
        if (inputRef.current?.value === value) {
          processBarcode(value);
        }
      }, 100);
    }
  };

  const handleSelectProduct = (product: Product) => {
    justProcessedRef.current = true;
    lastProcessTimeRef.current = Date.now();
    
    onProductSelect(product);
    setInputValue("");
    setSearchResults([]);
    setShowDropdown(false);
    
    setTimeout(() => {
      justProcessedRef.current = false;
    }, PROCESS_BLOCK_TIME);
    
    // On mobile, blur after selection to hide keyboard
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue("");
    setSearchResults([]);
    setShowDropdown(false);
    setErrorMessage(null);
  };

  const handleSearchClick = () => {
    if (inputValue.trim()) {
      if (looksLikeBarcode(inputValue)) {
        processBarcode(inputValue);
      } else {
        searchProducts(inputValue);
      }
    }
  };

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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "pl-10 pr-10 h-11 bg-background",
              errorMessage && "border-destructive focus-visible:ring-destructive"
            )}
            autoComplete="off"
            enterKeyHint="search"
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
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
        <Button
          type="button"
          size="icon"
          variant="default"
          className="h-11 w-11 flex-shrink-0"
          onClick={handleSearchClick}
          disabled={!inputValue.trim() || isSearching}
        >
          <Search className="h-4 w-4" />
        </Button>
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
          className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-[60vh] overflow-y-auto"
        >
          {searchResults.map((product) => (
            <div
              key={product._id}
              className="flex items-center gap-3 p-3 active:bg-accent transition-colors border-b last:border-b-0"
              onClick={() => handleSelectProduct(product)}
            >
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-14 h-14 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight mb-1">{product.name}</p>
                <p className="text-xs text-muted-foreground mb-1">
                  {product.barcode || "Không có mã"} • {product.unit}
                </p>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(product.salePrice ?? product.currentSalePrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hint text */}
      <p className="text-xs text-muted-foreground mt-2 px-1">
        💡 Quét barcode hoặc nhập tên sản phẩm để tìm kiếm
      </p>
    </div>
  );
}
