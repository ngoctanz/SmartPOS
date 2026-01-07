"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine } from "lucide-react";

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void | Promise<void>;
  placeholder?: string;
  showButton?: boolean;
  autoFocusOnMount?: boolean;
}

export function BarcodeScanner({
  onBarcodeScanned,
  placeholder = "Quét hoặc nhập mã barcode sản phẩm...",
  showButton = true,
  autoFocusOnMount = true,
}: BarcodeScannerProps) {
  const [barcodeInput, setBarcodeInput] = React.useState("");
  const [lastScannedTime, setLastScannedTime] = React.useState(0);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);
  const barcodeBufferRef = React.useRef<string>("");
  const lastKeyTimeRef = React.useRef<number>(0);

  // Auto focus on mount with retry mechanism
  React.useEffect(() => {
    if (!autoFocusOnMount) return;

    const focusInput = () => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    };

    // Focus immediately
    focusInput();

    // Retry focus after small delay (in case of animations/transitions)
    const timer = setTimeout(focusInput, 100);

    // Focus when window regains focus
    const handleFocus = () => focusInput();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [autoFocusOnMount]);

  // Focus helper function for external use
  const focusInput = React.useCallback(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const processBarcode = React.useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) return;
      await onBarcodeScanned(barcode.trim());
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
    },
    [onBarcodeScanned]
  );

  const handleBarcodeKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        e.preventDefault();
        const barcode = barcodeBufferRef.current || barcodeInput;
        if (barcode.trim()) {
          processBarcode(barcode.trim());
          barcodeBufferRef.current = "";
        }
        return;
      }

      // Detect barcode scanner (rapid keystrokes < 50ms)
      if (timeDiff < 50 && e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      } else if (e.key.length === 1) {
        barcodeBufferRef.current = e.key;
      }
    },
    [barcodeInput, processBarcode]
  );

  // Auto-submit for barcode scanner (numeric input >= 8 chars)
  React.useEffect(() => {
    if (!barcodeInput.trim()) return;

    const timer = setTimeout(() => {
      const barcode = barcodeInput.trim();
      if (barcode.length >= 8 && /^[0-9]+$/.test(barcode)) {
        processBarcode(barcode);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [barcodeInput, processBarcode]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    const now = Date.now();
    if (now - lastScannedTime < 100) return;
    setLastScannedTime(now);

    await processBarcode(barcode);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={barcodeInputRef}
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={handleBarcodeKeyDown}
          placeholder={placeholder}
          className="pl-10 h-11 bg-background"
          autoComplete="off"
          autoFocus
        />
      </div>
      {showButton && (
        <Button type="submit" className="h-11 px-6">
          Thêm
        </Button>
      )}
    </form>
  );
}
