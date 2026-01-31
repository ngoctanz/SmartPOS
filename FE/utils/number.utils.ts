/**
 * Format số lớn thành dạng rút gọn kiểu Việt Nam (nghìn, triệu, tỷ)
 * @param value - Số cần format
 * @param detailed - Hiển thị chi tiết (ví dụ: "1 tỷ 554 triệu")
 * @returns Chuỗi đã format
 */
export function formatCompactNumber(value: number, detailed: boolean = false): string {
  if (value === 0) return "0";
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  // >= 1 tỷ
  if (absValue >= 1_000_000_000) {
    const billions = Math.floor(absValue / 1_000_000_000);
    const millions = Math.floor((absValue % 1_000_000_000) / 1_000_000);
    
    if (detailed && millions > 0) {
      return `${sign}${billions} tỷ ${millions} triệu`;
    }
    return `${sign}${billions} tỷ`;
  }
  
  // >= 1 triệu
  if (absValue >= 1_000_000) {
    const millions = Math.floor(absValue / 1_000_000);
    const thousands = Math.floor((absValue % 1_000_000) / 1_000);
    
    if (detailed && thousands > 0) {
      return `${sign}${millions} triệu ${thousands} nghìn`;
    }
    return `${sign}${millions} triệu`;
  }
  
  // >= 1 nghìn
  if (absValue >= 1_000) {
    const thousands = Math.floor(absValue / 1_000);
    const hundreds = Math.floor((absValue % 1_000) / 100);
    
    if (detailed && hundreds > 0) {
      return `${sign}${thousands} nghìn ${hundreds} trăm`;
    }
    return `${sign}${thousands} nghìn`;
  }
  
  return `${sign}${absValue}`;
}

/**
 * Format số thành dạng đầy đủ với đơn vị Việt Nam
 * @param value - Số cần format
 * @returns Chuỗi đã format chi tiết
 */
export function formatDetailedNumber(value: number): string {
  return formatCompactNumber(value, true);
}

/**
 * Format tiền tệ thông minh - rút gọn nếu quá dài
 * @param value - Số tiền
 * @param compact - Có rút gọn không (mặc định: true nếu >= 10M)
 * @returns Chuỗi tiền tệ đã format
 */
export function formatSmartCurrency(value: number, compact: boolean = value >= 10_000_000): string {
  if (compact) {
    // Luôn hiển thị chi tiết (detailed = true)
    const compactNum = formatCompactNumber(value, true);
    return compactNum === "0" ? "0 đ" : `${compactNum} đ`;
  }
  
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

/**
 * Format tiền tệ chi tiết với đơn vị Việt Nam
 * @param value - Số tiền
 * @returns Chuỗi tiền tệ đã format chi tiết
 */
export function formatDetailedCurrency(value: number): string {
  const detailed = formatCompactNumber(value, true);
  return detailed === "0" ? "0 đ" : `${detailed} đ`;
}

/**
 * Format số với dấu phân cách hàng nghìn
 * @param value - Số cần format
 * @returns Chuỗi đã format
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}
