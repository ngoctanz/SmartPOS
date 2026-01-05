import { StatusCodes } from "http-status-codes";
import { dashboardService } from "../services/dashboardService.js";

const getSummary = async (req, res, next) => {
  try {
    const { period, branchId } = req.query;
    const result = await dashboardService.getSummary(
      period || "month",
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get dashboard summary successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getDailyStats = async (req, res, next) => {
  try {
    const { period, branchId } = req.query;
    const result = await dashboardService.getDailyStats(
      period || "month",
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get daily stats successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTopProducts = async (req, res, next) => {
  try {
    const { period, branchId, limit } = req.query;
    const result = await dashboardService.getTopProducts(
      period || "month",
      branchId || null,
      parseInt(limit) || 10
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get top products successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentStats = async (req, res, next) => {
  try {
    const { period, branchId } = req.query;
    const result = await dashboardService.getPaymentMethodStats(
      period || "month",
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get payment stats successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getLowStockAlert = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const result = await dashboardService.getLowStockAlert(branchId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get low stock alert successfully",
      results: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getFullDashboard = async (req, res, next) => {
  try {
    const { period, branchId } = req.query;
    const result = await dashboardService.getFullDashboard(
      period || "month",
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get full dashboard successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const dashboardController = {
  getSummary,
  getDailyStats,
  getTopProducts,
  getPaymentStats,
  getLowStockAlert,
  getFullDashboard,
};
