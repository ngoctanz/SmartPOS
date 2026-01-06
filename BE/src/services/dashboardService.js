import { Receipt } from "../models/receiptModel.js";
import { ImportReceipt } from "../models/importReceiptModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
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

    // Profit = Revenue - Import Cost (tính đơn giản)
    const profit = (revenueData.totalRevenue || 0) - (importData.totalAmount || 0);

    return {
      period,
      startDate,
      endDate,
      revenue: revenueData.totalRevenue || 0,
      totalImportCost: importData.totalAmount || 0,
      profit,
      totalOrders: revenueData.count || 0,
      totalImportReceipts: importData.count || 0,
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
    const [summary, dailyStats, topProducts, paymentStats] = await Promise.all([
      getSummary(period, branchId),
      getDailyStats(period, branchId),
      getTopProducts(period, branchId, 10),
      getPaymentMethodStats(period, branchId),
    ]);

    let lowStockAlert = [];
    if (branchId) {
      lowStockAlert = await getLowStockAlert(branchId);
    }

    return {
      summary,
      dailyStats,
      topProducts,
      paymentStats,
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
  getPaymentMethodStats,
  getLowStockAlert,
  getFullDashboard,
};
