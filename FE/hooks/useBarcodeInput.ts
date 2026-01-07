import { useState, useRef, useCallback, useEffect } from "react";
import useDebounce from "./useDebounce";

interface UseBarcodeInputOptions {
  /** Minimum length for auto-submit (default: 13) */
  minAutoSubmitLength?: number;
  /** Debounce delay for manual input in ms (default: 1000) */
  manualDebounceMs?: number;
  /** Debounce delay for scanner input in ms (default: 150) */
  scannerDebounceMs?: number;
  /** Callback when barcode is submitted */
  onSubmit: (barcode: string) => void | Promise<void>;
}

interface UseBarcodeInputReturn {
  /** Current input value */
  value: string;
  /** Set input value */
  setValue: (value: string) => void;
  /** Whether currently searching/processing */
  isSearching: boolean;
  /** Handle keydown event - attach to input */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Handle form submit */
  handleSubmit: (e?: React.FormEvent) => void;
  /** Input ref for focus management */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Reset input state */
  reset: () => void;
}

/**
 * Hook for handling barcode input with smart auto-submit logic:
 * - Scanner detected (rapid input < 50ms between keystrokes) -> auto-submit after 150ms pause
 * - Manual input >= minAutoSubmitLength chars -> auto-submit after 1s pause
 * - Manual input < minAutoSubmitLength chars -> must click button or press Enter
 */
export function useBarcodeInput({
  minAutoSubmitLength = 13,
  manualDebounceMs = 1000,
  scannerDebounceMs = 150,
  onSubmit,
}: UseBarcodeInputOptions): UseBarcodeInputReturn {
  const [value, setValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFromScanner, setIsFromScanner] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const keystrokeTimesRef = useRef<number[]>([]);
  const lastSubmitTimeRef = useRef<number>(0);

  // Debounced values for different scenarios
  const debouncedForScanner = useDebounce(value, scannerDebounceMs);
  const debouncedForManual = useDebounce(value, manualDebounceMs);

  const reset = useCallback(() => {
    setValue("");
    setIsFromScanner(false);
    keystrokeTimesRef.current = [];
    inputRef.current?.focus();
  }, []);

  const processBarcode = useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) return;

      // Prevent duplicate submissions
      const now = Date.now();
      if (now - lastSubmitTimeRef.current < 100) return;
      lastSubmitTimeRef.current = now;

      setIsSearching(true);
      try {
        await onSubmit(barcode.trim());
      } finally {
        setIsSearching(false);
        reset();
      }
    },
    [onSubmit, reset]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();

      // Enter key - submit immediately
      if (e.key === "Enter") {
        e.preventDefault();
        if (value.trim()) {
          processBarcode(value.trim());
        }
        return;
      }

      // Track keystroke timing for scanner detection
      if (e.key.length === 1) {
        keystrokeTimesRef.current.push(now);

        // Keep only last 5 keystroke times
        if (keystrokeTimesRef.current.length > 5) {
          keystrokeTimesRef.current.shift();
        }

        // Check if rapid typing (scanner) - average < 50ms between keystrokes
        if (keystrokeTimesRef.current.length >= 3) {
          const times = keystrokeTimesRef.current;
          const avgInterval =
            (times[times.length - 1] - times[0]) / (times.length - 1);
          setIsFromScanner(avgInterval < 50);
        }
      }
    },
    [value, processBarcode]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (value.trim()) {
        processBarcode(value.trim());
      }
    },
    [value, processBarcode]
  );

  // Auto-submit for scanner input (fast debounce)
  useEffect(() => {
    if (!debouncedForScanner.trim() || !isFromScanner) return;
    if (debouncedForScanner.length >= 3) {
      processBarcode(debouncedForScanner);
    }
  }, [debouncedForScanner, isFromScanner, processBarcode]);

  // Auto-submit for manual input >= minAutoSubmitLength (slow debounce)
  useEffect(() => {
    if (!debouncedForManual.trim() || isFromScanner) return;
    if (debouncedForManual.length >= minAutoSubmitLength) {
      processBarcode(debouncedForManual);
    }
  }, [debouncedForManual, isFromScanner, minAutoSubmitLength, processBarcode]);

  return {
    value,
    setValue,
    isSearching,
    handleKeyDown,
    handleSubmit,
    inputRef,
    reset,
  };
}
