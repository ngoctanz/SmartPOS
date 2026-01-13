import * as React from "react";

type KeyCombo =
  | "Enter"
  | "Escape"
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12";

interface UseHotkeyOptions {
  key: KeyCombo;
  onPress: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useHotkey({
  key,
  onPress,
  enabled = true,
  preventDefault = true,
}: UseHotkeyOptions): void {
  // Dùng ref để tránh stale closure trong event listener
  const callbackRef = React.useRef(onPress);

  React.useEffect(() => {
    callbackRef.current = onPress;
  }, [onPress]);

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) {
        if (preventDefault) e.preventDefault();
        callbackRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, enabled, preventDefault]);
}

/**
 * Hook để xử lý nhiều keyboard shortcuts cùng lúc
 *
 * @example
 * ```tsx
 * useHotkeys([
 *   { key: "F9", onPress: handleSubmit, enabled: canSubmit },
 *   { key: "Enter", onPress: handlePrint, enabled: showPrintButton },
 *   { key: "Escape", onPress: handleCancel, enabled: showDialog },
 * ]);
 * ```
 */
export function useHotkeys(shortcuts: UseHotkeyOptions[]): void {
  // Dùng refs để tránh stale closure
  const shortcutsRef = React.useRef(shortcuts);

  React.useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled !== false && e.key === shortcut.key) {
          if (shortcut.preventDefault !== false) e.preventDefault();
          shortcut.onPress();
          break; // Chỉ trigger 1 shortcut
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
