import { StatusCodes } from "http-status-codes";
import { receiptService } from "../services/receiptService.js";
import ApiError from "../utils/apiError.js";

const create = async (req, res, next) => {
  try {
    // branchId đã được inject từ middleware hoặc từ request body (admin)
    // Pass full user object for defense-in-depth security check
    const receipt = await receiptService.create(req.body, req.user);

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

/**
 * Create QR preview for transfer payment
 * POST /receipt/preview-qr
 */
const createQRPreview = async (req, res, next) => {
  try {
    const result = await receiptService.createQRPreview(req.body, req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "QR preview created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel QR preview
 * POST /receipt/cancel-preview
 */
const cancelQRPreview = async (req, res, next) => {
  try {
    const { orderCode } = req.body;
    const result = await receiptService.cancelQRPreview(orderCode, req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get QR preview data
 * GET /receipt/preview-qr/:orderCode
 */
const getQRPreview = async (req, res, next) => {
  try {
    const { orderCode } = req.params;
    const result = await receiptService.getQRPreview(parseInt(orderCode), req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update QR preview with new cart data
 * PUT /receipt/preview-qr/:orderCode
 */
const updateQRPreview = async (req, res, next) => {
  try {
    const { orderCode } = req.params;
    const result = await receiptService.updateQRPreview(
      parseInt(orderCode),
      req.body,
      req.user
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "QR preview updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm QR preview - Update draft to pending
 * POST /receipt/confirm-preview
 */
const confirmQRPreview = async (req, res, next) => {
  try {
    const { orderCode } = req.body;
    const result = await receiptService.confirmQRPreview(orderCode, req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "QR preview confirmed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    // Pass user for branch validation
    const receipt = await receiptService.cancel(req.params.id, req.user);
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
    // Pass user for branch validation
    const receipt = await receiptService.update(
      req.params.id,
      req.body,
      req.user
    );
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
    const { branchId, period, startDate, endDate } = req.query;
    // branchId is already injected for staff by middleware
    const stats = await receiptService.getStats(branchId, period, startDate, endDate);
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
    const { search, branchId, status, paymentMethod, period, startDate, endDate, page, limit } = req.query;

    // Nếu có params phân trang thì dùng paginated
    if (page || limit || search) {
      const options = {
        search,
        branchId,
        status,
        paymentMethod,
        period,
        startDate,
        endDate,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      };
      // Pass user for defense-in-depth security
      const result = await receiptService.getAllPaginated(options, req.user);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Get receipts successfully",
        data: result.data,
        pagination: result.pagination,
      });
    }

    // Fallback: lấy tất cả (cho các API cũ)
    const filter = {};
    if (status) filter.status = status;
    if (branchId) filter.branchId = branchId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    // Pass user for defense-in-depth security
    const receipts = await receiptService.getAll(filter, req.user);
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
    // Pass user for defense-in-depth security
    const receipt = await receiptService.getById(req.params.id, req.user);
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
    // Pass user for defense-in-depth security
    const receipt = await receiptService.getByCode(req.params.code, req.user);
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

    // Permission check is handled by middleware (injectUserBranch)
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
    // branchId is already injected for staff by middleware

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
    // branchId is already injected for staff by middleware

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
    // branchId is already injected for staff by middleware

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
    // branchId is already injected for staff by middleware

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

/**
 * Mark receipt as error
 */
const markError = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { errorReason } = req.body; // Optional reason
    const userId = req.user.userId;
    const user = req.user;

    const receipt = await receiptService.markAsError(id, userId, user, errorReason);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Đã đánh dấu hóa đơn lỗi và hoàn hàng về kho",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get error receipts
 */
const getErrors = async (req, res, next) => {
  try {
    const { page, limit, search, branchId, sortBy, sortOrder } = req.query;
    const user = req.user;

    const result = await receiptService.getErrorReceipts(
      { page, limit, search, branchId, sortBy, sortOrder },
      user
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get error receipt stats
 */
const getErrorStats = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const user = req.user;

    const stats = await receiptService.getErrorStats(branchId, user);

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete error receipt - Admin and Manager only
 */
const deleteErrorReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await receiptService.deleteErrorReceipt(id, user);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Đã xóa hóa đơn lỗi thành công",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single receipt - Admin and Manager only
 * DELETE /receipt/:id
 */
const deleteReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const result = await receiptService.deleteReceipt(id, user);

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete multiple receipts - Admin and Manager only
 * POST /receipt/delete-many
 */
const deleteManyReceipts = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const user = req.user;

    const result = await receiptService.deleteManyReceipts(ids, user);

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete receipts by month - Admin and Manager only
 * POST /receipt/delete-by-month
 */
const deleteReceiptsByMonth = async (req, res, next) => {
  try {
    const { month, year, branchId } = req.body;
    const user = req.user;

    const result = await receiptService.deleteReceiptsByMonth(
      month,
      year,
      branchId,
      user
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      data: {
        deletedCount: result.deletedCount,
        month: result.month,
        year: result.year,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const receiptController = {
  getStats,
  create,
  createQRPreview,
  cancelQRPreview,
  getQRPreview,
  updateQRPreview,
  confirmQRPreview,
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
  markError,
  getErrors,
  getErrorStats,
  deleteErrorReceipt,
  deleteReceipt,
  deleteManyReceipts,
  deleteReceiptsByMonth,
};
