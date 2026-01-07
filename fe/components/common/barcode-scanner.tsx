"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Search, Loader2 } from "lucide-react";
import { useBarcodeInput } from "@/hooks/useBarcodeInput";

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void | Promise<void>;
  placeholder?: string;
  showButton?: boolean;
  autoFocusOnMount?: boolean;
  /** Minimum length for auto-submit when typing manually (default: 13) */
  minAutoSubmitLength?: number;
}

export function BarcodeScanner({
  onBarcodeScanned,
  placeholder = "Quét hoặc nhập mã barcode sản phẩm...",
  showButton = true,
  autoFocusOnMount = true,
  minAutoSubmitLength = 13,
}: BarcodeScannerProps) {
  const {
    value,
    setValue,
    isSearching,
    handleKeyDown,
    handleSubmit,
    inputRef,
  } = useBarcodeInput({
    minAutoSubmitLength,
    onSubmit: onBarcodeScanned,
  });

  // Auto focus on mount
  React.useEffect(() => {
    if (!autoFocusOnMount) return;

    const focusInput = () => inputRef.current?.focus();
    focusInput();

    const timer = setTimeout(focusInput, 100);
    window.addEventListener("focus", focusInput);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", focusInput);
    };
  }, [autoFocusOnMount, inputRef]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 h-11 bg-background"
          autoComplete="off"
          autoFocus={autoFocusOnMount}
          disabled={isSearching}
        />
      </div>
      {showButton && (
        <Button
          type="submit"
          className="h-11 px-6 gap-2"
          disabled={!value.trim() || isSearching}
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tìm...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Tìm
            </>
          )}
        </Button>
      )}
    </form>
  );
}
