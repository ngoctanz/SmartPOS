import { StatusCodes } from "http-status-codes";
import { receiptService } from "../services/receiptService.js";

const create = async (req, res, next) => {
  try {
    // branchId đã được inject từ middleware hoặc từ request body (admin)
    const receipt = await receiptService.create(req.body, req.user.userId);

    // If transfer payment, include payment info in response
    const responseData = {
      success: true,
      message:
        receipt.paymentMethod === "transfer"
          ? "Receipt created! Please complete payment."
          : "Receipt created successfully!",
      data: receipt,
    };

    res.status(StatusCodes.CREATED).json(responseData);
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const receipt = await receiptService.cancel(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Receipt cancelled and stock restored!",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    // branchId đã được inject từ middleware cho staff
    if (req.query.branchId) filter.branchId = req.query.branchId;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

    const receipts = await receiptService.getAll(filter);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get receipts successfully",
      results: receipts.length,
      data: receipts,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const receipt = await receiptService.getById(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get receipt successfully",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getByCode = async (req, res, next) => {
  try {
    const receipt = await receiptService.getByCode(req.params.code);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get receipt successfully",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getByBranch = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const receipts = await receiptService.getByBranch(
      req.params.branchId,
      filter
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get receipts by branch successfully",
      results: receipts.length,
      data: receipts,
    });
  } catch (error) {
    next(error);
  }
};

const getByDateRange = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const receipts = await receiptService.getByDateRange(
      startDate,
      endDate,
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get receipts by date range successfully",
      results: receipts.length,
      data: receipts,
    });
  } catch (error) {
    next(error);
  }
};

const getRevenue = async (req, res, next) => {
  try {
    const { period, branchId } = req.query;
    const result = await receiptService.getRevenue(
      period || "month",
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get revenue successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getDailyRevenue = async (req, res, next) => {
  try {
    const { period, branchId } = req.query;
    const result = await receiptService.getDailyRevenue(
      period || "month",
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get daily revenue successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTopProducts = async (req, res, next) => {
  try {
    const { period, branchId, limit } = req.query;
    const result = await receiptService.getTopProducts(
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

/**
 * PayOS Webhook Handler
 * POST /receipt/webhook/payos
 */
const handlePayosWebhook = async (req, res, next) => {
  try {
    console.log("PayOS Webhook received:", JSON.stringify(req.body));

    const result = await receiptService.handlePaymentWebhook(req.body);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 to prevent PayOS from retrying
    res.status(StatusCodes.OK).json({ success: false, message: error.message });
  }
};

/**
 * Check payment status
 * GET /receipt/payment-status/:orderCode
 */
const checkPaymentStatus = async (req, res, next) => {
  try {
    const { orderCode } = req.params;
    const result = await receiptService.checkPaymentStatus(parseInt(orderCode));
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Payment status retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const receiptController = {
  create,
  cancel,
  getAll,
  getById,
  getByCode,
  getByBranch,
  getByDateRange,
  getRevenue,
  getDailyRevenue,
  getTopProducts,
  handlePayosWebhook,
  checkPaymentStatus,
};
