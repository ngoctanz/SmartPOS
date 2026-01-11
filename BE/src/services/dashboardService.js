import { Receipt } from "../models/receiptModel.js";
import { ImportReceipt } from "../models/importReceiptModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Product } from "../models/productModel.js";
import { getDateRange } from "../utils/dateUtils.js";

const getSummary = async (period = "month", branchId = null) => {
  const { startDate, endDate } = getDateRange(period);

  // Fetch all data in parallel
  const [revenueData, importData, totalProducts] = await Promise.all([
    Receipt.getRevenueByDateRange(startDate, endDate, branchId),
    ImportReceipt.getTotalImportByDateRange(startDate, endDate, branchId),
    Product.countDocuments({ status: "active" }),
  ]);

  return {
    period,
    startDate,
    endDate,
    revenue: revenueData.totalRevenue || 0,
    totalImportCost: importData.totalAmount || 0,
    totalOrders: revenueData.count || 0,
    totalImportReceipts: importData.count || 0,
    totalProducts,
  };
};

const getDailyStats = async (period = "month", branchId = null) => {
  const { startDate, endDate } = getDateRange(period);
  return Receipt.getDailyRevenue(startDate, endDate, branchId);
};

const getTopProducts = async (period = "month", branchId = null, limit = 10) => {
  const { startDate, endDate } = getDateRange(period);
  return Receipt.getTopSellingProducts(startDate, endDate, branchId, limit);
};

const getLeastSellingProducts = async (period = "month", branchId = null, limit = 10) => {
  const { startDate, endDate } = getDateRange(period);
  return Receipt.getLeastSellingProducts(startDate, endDate, branchId, limit);
};

const getRevenueByBranch = async (period = "month") => {
  const { startDate, endDate } = getDateRange(period);
  return Receipt.getRevenueByBranch(startDate, endDate);
};

const getSalesByCategory = async (period = "month", branchId = null) => {
  const { startDate, endDate } = getDateRange(period);
  return Receipt.getSalesByCategory(startDate, endDate, branchId);
};

const getPaymentMethodStats = async (period = "month", branchId = null) => {
  const { startDate, endDate } = getDateRange(period);
  return Receipt.getRevenueByPaymentMethod(startDate, endDate, branchId);
};

const getLowStockAlert = async (branchId) => {
  return BranchProduct.getLowStockByBranch(branchId);
};

const getFullDashboard = async (period = "month", branchId = null) => {
  const [
    summary,
    dailyStats,
    topProducts,
    leastSellingProducts,
    paymentStats,
    revenueByBranch,
    salesByCategory,
  ] = await Promise.all([
    getSummary(period, branchId),
    getDailyStats(period, branchId),
    getTopProducts(period, branchId, 10),
    getLeastSellingProducts(period, branchId, 10),
    getPaymentMethodStats(period, branchId),
    getRevenueByBranch(period),
    getSalesByCategory(period, branchId),
  ]);

  let lowStockAlert = [];
  if (branchId) {
    lowStockAlert = await getLowStockAlert(branchId);
  }

  return {
    summary,
    dailyStats,
    topProducts,
    leastSellingProducts,
    paymentStats,
    revenueByBranch,
    salesByCategory,
    lowStockAlert,
  };
};

export const dashboardService = {
  getSummary,
  getDailyStats,
  getTopProducts,
  getLeastSellingProducts,
  getRevenueByBranch,
  getSalesByCategory,
  getPaymentMethodStats,
  getLowStockAlert,
  getFullDashboard,
};
