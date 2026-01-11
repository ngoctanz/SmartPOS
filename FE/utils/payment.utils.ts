/**
 * Payment utilities for cash transactions
 */

// Các mệnh giá tiền Việt Nam (đơn vị: nghìn đồng)
const DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

/**
 * Tính tiền thối
 * @param totalAmount - Tổng tiền hàng
 * @param customerPaid - Tiền khách đưa
 * @returns Tiền thối (0 nếu chưa đủ)
 */
export const calculateChange = (totalAmount: number, customerPaid: number): number => {
  if (customerPaid < totalAmount) return 0;
  return customerPaid - totalAmount;
};

/**
 * Làm tròn lên đến mệnh giá gần nhất
 * @param amount - Số tiền (đơn vị: đồng)
 * @param denomination - Mệnh giá (đơn vị: nghìn đồng)
 * @returns Số tiền làm tròn (đơn vị: đồng)
 */
const roundUpToDenomination = (amount: number, denomination: number): number => {
  const denomInDong = denomination * 1000;
  return Math.ceil(amount / denomInDong) * denomInDong;
};

/**
 * Gợi ý các mệnh giá tiền khách có thể đưa
 * @param totalAmount - Tổng tiền hàng (đơn vị: đồng)
 * @returns Mảng các gợi ý tiền khách đưa (đơn vị: đồng)
 */
export const suggestPaymentAmounts = (totalAmount: number): number[] => {
  if (totalAmount <= 0) return [];

  const suggestions: Set<number> = new Set();
  
  // Luôn thêm số tiền chính xác
  suggestions.add(totalAmount);

  // Tìm các mệnh giá phù hợp để làm tròn
  for (const denom of DENOMINATIONS) {
    const rounded = roundUpToDenomination(totalAmount, denom);
    // Chỉ thêm nếu >= totalAmount và không quá lớn (tối đa gấp 3 lần)
    if (rounded >= totalAmount && rounded <= totalAmount * 3) {
      suggestions.add(rounded);
    }
  }

  // Thêm một số mức cố định phổ biến nếu phù hợp
  const fixedAmounts = [10000, 20000, 30000, 50000, 100000, 200000, 500000, 1000000, 2000000];
  for (const amount of fixedAmounts) {
    if (amount >= totalAmount && amount <= totalAmount * 5) {
      suggestions.add(amount);
    }
  }

  // Sắp xếp và giới hạn số lượng gợi ý (tối đa 10)
  return Array.from(suggestions)
    .sort((a, b) => a - b)
    .slice(0, 10);
};

/**
 * Chuyển đổi từ nghìn đồng sang đồng
 * @param thousands - Số tiền (đơn vị: nghìn đồng)
 * @returns Số tiền (đơn vị: đồng)
 */
export const thousandsToDong = (thousands: number): number => {
  return thousands * 1000;
};

/**
 * Chuyển đổi từ đồng sang nghìn đồng
 * @param dong - Số tiền (đơn vị: đồng)
 * @returns Số tiền (đơn vị: nghìn đồng)
 */
export const dongToThousands = (dong: number): number => {
  return dong / 1000;
};

/**
 * Format số tiền dạng nghìn đồng (vd: 25k, 100k)
 * @param dong - Số tiền (đơn vị: đồng)
 * @returns Chuỗi format (vd: "25k", "100k")
 */
export const formatThousands = (dong: number): string => {
  const thousands = dong / 1000;
  if (thousands >= 1000) {
    return `${(thousands / 1000).toFixed(thousands % 1000 === 0 ? 0 : 1)}tr`;
  }
  return `${thousands}k`;
};
