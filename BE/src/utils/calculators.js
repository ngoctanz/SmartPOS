/**
 * Utility functions for calculations
 */

// Re-export date utilities from dateUtils.js for backward compatibility
export { getDateRange, getCustomDateRange, buildDateFilter, PERIOD_TYPES } from "./dateUtils.js";

/**
 * Format currency (VND)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

/**
 * Round to specific decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
export const roundTo = (value, decimals = 0) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Calculate weighted average price
 * newAvg = (oldQty × oldAvg + newQty × newPrice) / (oldQty + newQty)
 */
export const calculateWeightedAverage = (oldQty, oldAvg, newQty, newPrice) => {
  if (oldQty + newQty === 0) return 0;
  return Math.round((oldQty * oldAvg + newQty * newPrice) / (oldQty + newQty));
};
