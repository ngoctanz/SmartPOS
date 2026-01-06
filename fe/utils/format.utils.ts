/**
 * Format number to Vietnamese currency string (VNĐ)
 * @param amount Number to format
 * @param showSymbol Whether to show "đ" symbol
 * @returns Formatted string
 */
export const formatCurrency = (
  amount: number | string,
  showSymbol: boolean = true
): string => {
  const numericValue = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numericValue)) return "0" + (showSymbol ? " đ" : "");

  const formatted = new Intl.NumberFormat("vi-VN").format(numericValue);

  return showSymbol ? `${formatted} đ` : formatted;
};

/**
 * Clean currency string to numeric value
 * @param value String like "1.000.000" or "1000000"
 * @returns Number
 */
export const parseCurrency = (value: string): number => {
  // Remove all non-digit characters
  const cleanValue = value.replace(/\D/g, "");
  return parseInt(cleanValue, 10) || 0;
};
