import { Receipt } from "../models/receiptModel.js";
import { ImportReceipt } from "../models/importReceiptModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Product } from "../models/productModel.js";
import { getDateRange } from "../utils/calculators.js";

const getSummary = async (period = "month", branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);

    // Get revenue
    const revenueData = await Receipt.getRevenueByDateRange(startDate, endDate, branchId);

    // Get total import cost
    const importData = await ImportReceipt.getTotalImportByDateRange(
      startDate,
      endDate,
      branchId
    );

    // Get total products count
    const totalProducts = await Product.countDocuments({ status: "active" });

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
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getDailyStats = async (period = "month", branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getDailyRevenue(startDate, endDate, branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getTopProducts = async (period = "month", branchId = null, limit = 10) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getTopSellingProducts(startDate, endDate, branchId, limit);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getLeastSellingProducts = async (period = "month", branchId = null, limit = 10) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getLeastSellingProducts(startDate, endDate, branchId, limit);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getRevenueByBranch = async (period = "month") => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getRevenueByBranch(startDate, endDate);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getSalesByCategory = async (period = "month", branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getSalesByCategory(startDate, endDate, branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getPaymentMethodStats = async (period = "month", branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getRevenueByPaymentMethod(startDate, endDate, branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getLowStockAlert = async (branchId) => {
  try {
    return await BranchProduct.getLowStockByBranch(branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getFullDashboard = async (period = "month", branchId = null) => {
  try {
    const [summary, dailyStats, topProducts, leastSellingProducts, paymentStats, revenueByBranch, salesByCategory] = await Promise.all([
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
  } catch (error) {
    throw new Error(error.message || error);
  }
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
