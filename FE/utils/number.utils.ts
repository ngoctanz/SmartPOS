/**
 * Format số lớn thành dạng rút gọn (nghìn, triệu, tỷ)
 * @param value - Số cần format
 * @param decimals - Số chữ số thập phân (mặc định: 1)
 * @returns Chuỗi đã format
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
  if (value === 0) return "0";
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(6)} tỷ`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(decimals)} triệu`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(decimals)} nghìn`;
  }
  
  return `${sign}${absValue}`;
}

/**
 * Format tiền tệ thông minh - rút gọn nếu quá dài
 * @param value - Số tiền
 * @param compact - Có rút gọn không (mặc định: true nếu >= 10M)
 * @returns Chuỗi tiền tệ đã format
 */
export function formatSmartCurrency(value: number, compact: boolean = value >= 10_000_000): string {
  if (compact) {
    const compactNum = formatCompactNumber(value);
    return `${compactNum} đ`;
  }
  
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

/**
 * Format số với dấu phân cách hàng nghìn
 * @param value - Số cần format
 * @returns Chuỗi đã format
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}
