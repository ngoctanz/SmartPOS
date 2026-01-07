import { StatusCodes } from "http-status-codes";
import { receiptService } from "../services/receiptService.js";
import ApiError from "../utils/apiError.js";

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

const update = async (req, res, next) => {
  try {
    const receipt = await receiptService.update(req.params.id, req.body);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Receipt updated successfully!",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
    try {
        const { branchId } = req.query;
        // If user is staff, force branchId
        const effectiveBranchId = req.user.role === 'staff' ? req.user.branchId : branchId;

        const stats = await receiptService.getStats(effectiveBranchId);
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Get receipt stats successfully",
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};


const getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    
    // Check role to filter by branch
    if (req.user.role === 'staff') {
      filter.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }

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

    // Check permission if staff
    if (req.user.role === 'staff' && req.user.branchId !== req.params.branchId) {
       throw new ApiError(StatusCodes.FORBIDDEN, "Forbidden: You do not have permission");
    }

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
    const effectiveBranchId = req.user.role === 'staff' ? req.user.branchId : branchId;

    const receipts = await receiptService.getByDateRange(
      startDate,
      endDate,
      effectiveBranchId || null
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
    const effectiveBranchId = req.user.role === 'staff' ? req.user.branchId : branchId;

    const result = await receiptService.getRevenue(
      period || "month",
      effectiveBranchId || null
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
    const effectiveBranchId = req.user.role === 'staff' ? req.user.branchId : branchId;

    const result = await receiptService.getDailyRevenue(
      period || "month",
      effectiveBranchId || null
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
    const effectiveBranchId = req.user.role === 'staff' ? req.user.branchId : branchId;

    const result = await receiptService.getTopProducts(
      period || "month",
      effectiveBranchId || null,
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
  getStats,
  create,
  cancel,
  update,
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
