/**
 * Printer Configuration Management
 *
 * Quản lý cấu hình máy in cho hệ thống POS
 * - Lưu trữ vào localStorage
 * - Hỗ trợ smart print (lần đầu hỏi, sau auto)
 * - Có thể reset khi cần đổi máy in
 *
 * @module printer-config
 */

// === Types ===

export interface PrinterConfig {
  /** Đã cấu hình máy in chưa (đã bấm Print ít nhất 1 lần trong ca) */
  configured: boolean;
  /** Timestamp lần cấu hình cuối */
  lastConfiguredAt: string | null;
  /** ID của user đã cấu hình (để phân biệt giữa các ca) */
  configuredByUserId: string | null;
  /** Tự động reset khi đăng xuất */
  autoResetOnLogout: boolean;
  /** Luôn hiện dialog (tắt auto-print) */
  alwaysShowDialog: boolean;
}

export interface PrinterStatus {
  /** Máy in đã sẵn sàng (đã setup) */
  isReady: boolean;
  /** Cần hiện dialog setup không */
  needsSetup: boolean;
  /** Thông tin config hiện tại */
  config: PrinterConfig;
}

// === Constants ===

const STORAGE_KEY = "smartpos_printer_config";
const CONFIG_EXPIRY_HOURS = 12; // Auto reset sau 12 giờ (hết ca)

const DEFAULT_CONFIG: PrinterConfig = {
  configured: false,
  lastConfiguredAt: null,
  configuredByUserId: null,
  autoResetOnLogout: true,
  alwaysShowDialog: false,
};

// === Core Functions ===

/**
 * Lấy config từ localStorage
 * Có validation và fallback
 */
export function getPrinterConfig(): PrinterConfig {
  if (typeof window === "undefined") {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_CONFIG };
    }

    const parsed = JSON.parse(stored) as Partial<PrinterConfig>;

    // Merge với default để đảm bảo có đủ fields
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch (error) {
    console.warn("[PrinterConfig] Failed to parse stored config:", error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Lưu config vào localStorage
 */
export function savePrinterConfig(config: Partial<PrinterConfig>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getPrinterConfig();
    const updated: PrinterConfig = {
      ...current,
      ...config,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[PrinterConfig] Failed to save config:", error);
  }
}

/**
 * Đánh dấu máy in đã được cấu hình
 * Gọi sau khi user đã bấm Print trong dialog
 */
export function markPrinterConfigured(userId?: string): void {
  savePrinterConfig({
    configured: true,
    lastConfiguredAt: new Date().toISOString(),
    configuredByUserId: userId || null,
  });
}

/**
 * Reset cấu hình máy in
 * Lần in tiếp theo sẽ hiện dialog
 */
export function resetPrinterConfig(): void {
  savePrinterConfig({
    configured: false,
    lastConfiguredAt: null,
    configuredByUserId: null,
  });
}

/**
 * Xóa hoàn toàn config (dùng khi đăng xuất)
 */
export function clearPrinterConfig(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("[PrinterConfig] Failed to clear config:", error);
  }
}

/**
 * Cập nhật setting alwaysShowDialog
 */
export function setAlwaysShowDialog(value: boolean): void {
  savePrinterConfig({ alwaysShowDialog: value });
}

/**
 * Cập nhật setting autoResetOnLogout
 */
export function setAutoResetOnLogout(value: boolean): void {
  savePrinterConfig({ autoResetOnLogout: value });
}

// === Status Functions ===

/**
 * Kiểm tra config đã hết hạn chưa (quá 12 giờ)
 */
function isConfigExpired(config: PrinterConfig): boolean {
  if (!config.lastConfiguredAt) return true;

  const lastConfigured = new Date(config.lastConfiguredAt);
  const now = new Date();
  const hoursDiff =
    (now.getTime() - lastConfigured.getTime()) / (1000 * 60 * 60);

  return hoursDiff > CONFIG_EXPIRY_HOURS;
}

/**
 * Kiểm tra config có thuộc về user hiện tại không
 */
function isConfigForCurrentUser(
  config: PrinterConfig,
  currentUserId?: string,
): boolean {
  if (!config.configuredByUserId) return true; // Không có userId thì accept
  if (!currentUserId) return true; // Không có currentUserId thì accept
  return config.configuredByUserId === currentUserId;
}

/**
 * Lấy trạng thái máy in hiện tại
 * Dùng để quyết định có cần hiện dialog setup không
 */
export function getPrinterStatus(currentUserId?: string): PrinterStatus {
  const config = getPrinterConfig();

  // Nếu user bật "luôn hiện dialog" thì luôn cần setup
  if (config.alwaysShowDialog) {
    return {
      isReady: false,
      needsSetup: true,
      config,
    };
  }

  // Chưa configure → cần setup
  if (!config.configured) {
    return {
      isReady: false,
      needsSetup: true,
      config,
    };
  }

  // Config đã hết hạn → cần setup lại
  if (isConfigExpired(config)) {
    return {
      isReady: false,
      needsSetup: true,
      config,
    };
  }

  // Config không phải của user hiện tại → cần setup lại
  if (!isConfigForCurrentUser(config, currentUserId)) {
    return {
      isReady: false,
      needsSetup: true,
      config,
    };
  }

  // Tất cả OK → sẵn sàng auto-print
  return {
    isReady: true,
    needsSetup: false,
    config,
  };
}

/**
 * Kiểm tra nhanh: Có nên hiện dialog in không?
 * Shorthand cho getPrinterStatus().needsSetup
 */
export function shouldShowPrintDialog(currentUserId?: string): boolean {
  return getPrinterStatus(currentUserId).needsSetup;
}

// === Logout Handler ===

/**
 * Xử lý khi đăng xuất
 * Gọi từ auth context khi logout
 */
export function handleLogout(): void {
  const config = getPrinterConfig();

  if (config.autoResetOnLogout) {
    clearPrinterConfig();
  }
}
