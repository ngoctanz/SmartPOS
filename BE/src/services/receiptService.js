import { Receipt } from "../models/receiptModel.js";
import { Product } from "../models/productModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";
import { getDateRange } from "../utils/calculators.js";
import { payosService } from "./payosService.js";
import { socketService } from "./socketService.js";
import {
  validateBranchAccess,
  buildSecureFilter,
  validateRecordAccess,
} from "../utils/branchSecurity.js";

const getStats = async (branchId) => {
  try {
    return await Receipt.getStats(branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const create = async (data, user) => {
  try {
    // Defense-in-depth: Double check branch access
    validateBranchAccess(user, data.branchId, "create receipt for");

    // Validate branch exists
    await Branch.findBranchById(data.branchId);

    const listProduct = [];
    let totalAmount = 0;

    // Validate stock và prepare list
    for (const item of data.listProduct) {
      const product = await Product.findProductById(item.productId);
      const productInfo = await BranchProduct.getProductInfo(data.branchId, item.productId);

      // Get sale price: priority is item.salePrice > branchProduct.salePrice > product.currentSalePrice
      const salePrice = item.salePrice ?? productInfo.salePrice ?? product.currentSalePrice ?? 0;
      const subtotal = salePrice * item.quantity;

      listProduct.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        salePrice,
      });

      totalAmount += subtotal;
    }

    // Determine initial status based on payment method
    const isTransfer = data.paymentMethod === "transfer";
    const initialStatus = isTransfer ? "pending" : "completed";

    // Create receipt data
    const receiptData = {
      branchId: data.branchId,
      createdBy: user.userId,
      listProduct,
      totalAmount,
      paymentMethod: data.paymentMethod || "cash",
      status: initialStatus,
    };

    // If transfer payment, create PayOS payment link
    if (isTransfer) {
      try {
        const orderCode = payosService.generateOrderCode();
        const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";
        const paymentDescription = `HD${orderCode}`.slice(0, 25); // Max 25 chars

        const paymentResult = await payosService.createPaymentLink({
          orderCode,
          amount: Math.round(totalAmount),
          description: paymentDescription,
          returnUrl: `${baseUrl}/trang-quan-ly/hoa-don`,
          cancelUrl: `${baseUrl}/trang-quan-ly/hoa-don`,
          expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        });

        if (paymentResult.success) {
          receiptData.paymentInfo = {
            orderCode,
            linkId: paymentResult.data.paymentLinkId,
            qrCode: paymentResult.data.qrCode,
            checkoutUrl: paymentResult.data.checkoutUrl,
            accountNumber: paymentResult.data.accountNumber,
            accountName: paymentResult.data.accountName,
            bin: paymentResult.data.bin,
            // Save for regenerating VietQR later
            amount: Math.round(totalAmount),
            description: paymentDescription,
            status: "pending",
          };
        }
      } catch (payosError) {
        console.error("PayOS Error:", payosError);
        throw new ApiError(
          500,
          `Lỗi tạo thanh toán PayOS: ${payosError.message}`
        );
      }
    }

    const receipt = await Receipt.createReceipt(receiptData);

    // Only decrease stock if payment is completed (not transfer)
    if (!isTransfer) {
      for (const item of listProduct) {
        await BranchProduct.decreaseStock(
          data.branchId,
          item.productId,
          item.quantity
        );
      }
    }

    return receipt;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const cancel = async (id) => {
  try {
    const receipt = await Receipt.findReceiptById(id);

    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Receipt already cancelled");
    }

    const branchId = receipt.branchId._id || receipt.branchId;

    // Restore stock
    for (const item of receipt.listProduct) {
      await BranchProduct.increaseStock(
        branchId,
        item.productId,
        item.quantity
      );
    }

    return await Receipt.updateStatus(id, "cancelled");
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAll = async (filter = {}, user = null) => {
  try {
    // Defense-in-depth: Apply secure filter if user provided
    const secureFilter = user ? buildSecureFilter(user, filter) : filter;
    return await Receipt.findAllReceipts(secureFilter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllPaginated = async (options = {}, user = null) => {
  try {
    // Defense-in-depth: Ensure branchId filter for staff
    if (user && user.role !== "admin" && user.branchId) {
      options.branchId = user.branchId;
    }
    return await Receipt.findAllReceiptsPaginated(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id, user = null) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Receipt ID is required!");
    }
    const receipt = await Receipt.findReceiptById(id);

    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "receipt");
    }

    return receipt;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByCode = async (code, user = null) => {
  try {
    if (!code || code.trim() === "") {
      throw new ApiError(400, "Code is required!");
    }
    const receipt = await Receipt.findReceiptByCode(code);
    if (!receipt) {
      throw new ApiError(404, "Receipt not found");
    }

    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "receipt");
    }

    return receipt;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByBranch = async (branchId, filter = {}) => {
  try {
    if (!branchId || branchId.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }
    return await Receipt.findReceiptsByBranch(branchId, filter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByDateRange = async (startDate, endDate, branchId = null) => {
  try {
    return await Receipt.findReceiptsByDateRange(
      new Date(startDate),
      new Date(endDate),
      branchId
    );
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getRevenue = async (period, branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getRevenueByDateRange(startDate, endDate, branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getDailyRevenue = async (period, branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getDailyRevenue(startDate, endDate, branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getTopProducts = async (period, branchId = null, limit = 10) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getTopSellingProducts(
      startDate,
      endDate,
      branchId,
      limit
    );
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getRevenueByPaymentMethod = async (period, branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getRevenueByPaymentMethod(
      startDate,
      endDate,
      branchId
    );
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Handle PayOS webhook callback
 */
const handlePaymentWebhook = async (webhookData) => {
  try {
    // Log raw webhook for debugging
    console.log("[Webhook] Received:", JSON.stringify(webhookData, null, 2));

    // Verify webhook data
    const verifiedData = payosService.verifyPaymentWebhookData(webhookData);
    if (!verifiedData) {
      console.log("[Webhook] Invalid signature, skipping...");
      // Return success to prevent PayOS from retrying
      return { success: true, message: "Invalid signature" };
    }

    const orderCode = verifiedData.orderCode || webhookData.data?.orderCode;
    if (!orderCode) {
      console.log("[Webhook] No orderCode found");
      return { success: true, message: "No orderCode" };
    }

    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      console.log(`[Webhook] Receipt not found for orderCode: ${orderCode}`);
      return { success: true }; // Return success to prevent PayOS from retrying
    }

    // Already processed
    if (receipt.paymentInfo?.status !== "pending") {
      console.log(
        `[Webhook] Receipt ${receipt.code} already processed (status: ${receipt.paymentInfo?.status})`
      );
      return { success: true };
    }

    // Check webhook code/status
    // PayOS webhook codes: "00" = success, others = failure
    const code = webhookData.code;
    const success = webhookData.success;
    const payosStatus = webhookData.data?.status || verifiedData.status;

    console.log(
      `[Webhook] Processing: code=${code}, success=${success}, payosStatus=${payosStatus}`
    );

    // Success payment
    if (code === "00" && success) {
      // Update payment status to paid
      await Receipt.updatePaymentStatus(orderCode, "paid", "completed");

      // Decrease stock after successful payment
      const branchId = receipt.branchId._id || receipt.branchId;
      for (const item of receipt.listProduct) {
        await BranchProduct.decreaseStock(
          branchId,
          item.productId,
          item.quantity
        );
      }

      console.log(`[Webhook] ✓ Payment confirmed for receipt: ${receipt.code}`);

      // Broadcast payment success via WebSocket
      socketService.broadcastPaymentSuccess(branchId.toString(), {
        receiptCode: receipt.code,
        amount: receipt.totalAmount,
        timestamp: new Date().toISOString(),
      });

      return { success: true, message: "Payment confirmed" };
    }

    // Handle expired status from PayOS
    if (payosStatus === "EXPIRED" || code === "expired") {
      await Receipt.updatePaymentStatus(orderCode, "expired", "cancelled");
      console.log(`[Webhook] ✗ Payment expired for receipt: ${receipt.code}`);
      return { success: true, message: "Payment expired" };
    }

    // Handle cancelled status from PayOS
    if (payosStatus === "CANCELLED" || code === "cancelled") {
      await Receipt.updatePaymentStatus(orderCode, "cancelled", "cancelled");
      console.log(`[Webhook] ✗ Payment cancelled for receipt: ${receipt.code}`);
      return { success: true, message: "Payment cancelled" };
    }

    // Payment failed for other reasons
    await Receipt.updatePaymentStatus(orderCode, "cancelled", "cancelled");
    console.log(
      `[Webhook] ✗ Payment failed for receipt: ${receipt.code} (code: ${code})`
    );

    return { success: true, message: "Payment failed" };
  } catch (error) {
    console.error("[Webhook] Error:", error);
    // Always return success to prevent PayOS from endless retrying
    return { success: true, error: error.message };
  }
};

/**
 * Check payment status from PayOS
 */
const checkPaymentStatus = async (orderCode) => {
  try {
    const paymentInfo = await payosService.getPaymentInfo(orderCode);
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      throw new ApiError(404, "Receipt not found");
    }

    // Update local status based on PayOS status
    if (
      paymentInfo.status === "PAID" &&
      receipt.paymentInfo?.status !== "paid"
    ) {
      await Receipt.updatePaymentStatus(orderCode, "paid", "completed");

      // Decrease stock
      const branchId = receipt.branchId._id || receipt.branchId;
      for (const item of receipt.listProduct) {
        await BranchProduct.decreaseStock(
          branchId,
          item.productId,
          item.quantity
        );
      }
    } else if (paymentInfo.status === "CANCELLED") {
      await Receipt.updatePaymentStatus(orderCode, "cancelled", "cancelled");
    } else if (paymentInfo.status === "EXPIRED") {
      await Receipt.updatePaymentStatus(orderCode, "expired", "cancelled");
    }

    return {
      paymentStatus: paymentInfo.status,
      receipt: await Receipt.findReceiptByOrderCode(orderCode),
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Get payment info by order code
 */
const getPaymentInfo = async (orderCode) => {
  try {
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);
    if (!receipt) {
      throw new ApiError(404, "Receipt not found");
    }

    return {
      receipt,
      paymentInfo: receipt.paymentInfo?.orderCode
        ? await payosService.getPaymentInfo(orderCode)
        : null,
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Update receipt products and total
 */
const update = async (id, data) => {
  try {
    const receipt = await Receipt.findReceiptById(id);

    if (!receipt) {
      throw new ApiError(404, "Receipt not found");
    }

    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Cannot update cancelled receipt");
    }

    const branchId = receipt.branchId._id || receipt.branchId;

    // If updating products, validate stock for new/increased items
    if (data.listProduct) {
      // Calculate stock adjustments needed
      const oldProducts = new Map(
        receipt.listProduct.map((p) => [p.productId.toString(), p.quantity])
      );

      for (const item of data.listProduct) {
        const product = await Product.findProductById(item.productId);
        const oldQty = oldProducts.get(item.productId.toString()) || 0;
        const qtyDiff = item.quantity - oldQty;

        // Only check stock if quantity is increasing
        if (qtyDiff > 0 && receipt.status === "completed") {
          const stock = await BranchProduct.getStock(branchId, item.productId);
          if (stock < qtyDiff) {
            throw new ApiError(
              400,
              `Insufficient stock for ${product.name}. Available: ${stock}, Additional needed: ${qtyDiff}`
            );
          }
        }
      }

      // Adjust stock based on changes (only for completed receipts)
      if (receipt.status === "completed") {
        // Restore old stock
        for (const item of receipt.listProduct) {
          await BranchProduct.increaseStock(
            branchId,
            item.productId,
            item.quantity
          );
        }

        // Decrease new stock
        for (const item of data.listProduct) {
          await BranchProduct.decreaseStock(
            branchId,
            item.productId,
            item.quantity
          );
        }
      }
    }

    // Update receipt
    const updatedReceipt = await Receipt.findByIdAndUpdate(
      id,
      {
        listProduct: data.listProduct,
        totalAmount: data.totalAmount,
      },
      { new: true, runValidators: true }
    )
      .populate("branchId", "branchName address")
      .populate("createdBy", "userName name")
      .lean();

    return updatedReceipt;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Mark receipt as error and return products to stock
 */
const markAsError = async (receiptId, userId, user, errorReason = null) => {
  try {
    // Get receipt
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      throw new ApiError(404, "Không tìm thấy hóa đơn");
    }

    // Extract branchId (could be ObjectId or populated object)
    const branchId = receipt.branchId._id || receipt.branchId;

    // Validate access
    validateBranchAccess(user, branchId, "mark error for");

    // Validate status (allow marking error for both pending and completed)
    if (receipt.status === "cancelled") {
      throw new ApiError(
        400,
        "Không thể đánh dấu lỗi cho hóa đơn đã hủy"
      );
    }

    // Validate not already marked as error
    if (receipt.isError) {
      throw new ApiError(400, "Hóa đơn đã được đánh dấu lỗi trước đó");
    }

    // Try to use transaction if available (replica set)
    // Otherwise, fall back to sequential operations
    const mongoose = await import("mongoose");
    let session = null;
    let useTransaction = false;

    try {
      // Check if we can use transactions
      const client = mongoose.default.connection.getClient();
      const admin = client.db().admin();
      const serverInfo = await admin.serverStatus();

      // Only use transactions if replica set is available
      if (serverInfo.repl && serverInfo.repl.setName) {
        session = await mongoose.default.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (error) {
      console.log("Transactions not available, using sequential operations");
      useTransaction = false;
    }

    try {
      // Return products to stock ONLY if receipt was completed (stock was decreased)
      if (receipt.status === "completed") {
        for (const item of receipt.listProduct) {
          await BranchProduct.increaseStock(
            branchId,
            item.productId,
            item.quantity,
            session
          );
        }
      }

      // Update receipt
      receipt.isError = true;
      receipt.markedErrorBy = userId;
      receipt.markedErrorAt = new Date();
      receipt.errorReason = errorReason || null;

      if (useTransaction && session) {
        await receipt.save({ session });
        await session.commitTransaction();
      } else {
        await receipt.save();
      }

      // Populate for response
      const populatedReceipt = await Receipt.findById(receiptId)
        .populate("branchId", "branchName")
        .populate("createdBy", "userName name")
        .populate("markedErrorBy", "userName name")
        .lean();

      return populatedReceipt;
    } catch (error) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get error receipts with pagination
 */
const getErrorReceipts = async (options, user) => {
  try {
    const { page = 1, limit = 20, search, branchId, sortBy = "markedErrorAt", sortOrder = "desc" } = options;

    // Build query
    const query = { isError: true };

    // Search by code
    if (search && search.trim()) {
      query.code = { $regex: search, $options: "i" };
    }

    // Branch filter with access control
    if (user.role === "staff" || user.role === "manager") {
      // Staff and Manager can only see their branch
      query.branchId = user.branchId;
    } else if (branchId) {
      // Admin can filter by branch
      query.branchId = branchId;
    }

    // Count total
    const total = await Receipt.countDocuments(query);
    const skip = (page - 1) * limit;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Fetch data
    const data = await Receipt.find(query)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .populate("markedErrorBy", "userName name")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Get error receipt statistics
 */
const getErrorStats = async (branchId, user) => {
  try {
    const query = { isError: true };

    // Access control - manager and staff can only see their branch
    if (user.role === "staff" || user.role === "manager") {
      query.branchId = user.branchId;
    } else if (branchId) {
      query.branchId = branchId;
    }

    // Total count and amount
    const totalResult = await Receipt.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalErrorReceipts: { $sum: 1 },
          totalErrorAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totals = totalResult[0] || {
      totalErrorReceipts: 0,
      totalErrorAmount: 0,
    };

    // By branch (admin only)
    let errorsByBranch = [];
    if (user.role === "admin") {
      errorsByBranch = await Receipt.aggregate([
        { $match: { isError: true } },
        {
          $group: {
            _id: "$branchId",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
        {
          $lookup: {
            from: "branches",
            localField: "_id",
            foreignField: "_id",
            as: "branch",
          },
        },
        { $unwind: "$branch" },
        {
          $project: {
            branchId: "$_id",
            branchName: "$branch.branchName",
            count: 1,
            totalAmount: 1,
          },
        },
        { $sort: { count: -1 } },
      ]);
    }

    // Recent errors
    const recentErrors = await Receipt.find(query)
      .select("code totalAmount markedErrorAt")
      .sort({ markedErrorAt: -1 })
      .limit(5)
      .lean();

    return {
      ...totals,
      errorsByBranch,
      recentErrors,
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Delete error receipt - Admin and Manager only
 */
const deleteErrorReceipt = async (id, user) => {
  try {
    const receipt = await Receipt.findById(id);
    
    if (!receipt) {
      throw new ApiError(404, "Không tìm thấy hóa đơn");
    }

    if (!receipt.isError) {
      throw new ApiError(400, "Chỉ có thể xóa hóa đơn đã được đánh dấu lỗi");
    }

    // Extract branchId
    const branchId = receipt.branchId._id || receipt.branchId;

    // Manager can only delete error receipts in their branch
    if (user.role === "manager") {
      if (!user.branchId || user.branchId.toString() !== branchId.toString()) {
        throw new ApiError(403, "Bạn không có quyền xóa hóa đơn lỗi của chi nhánh khác");
      }
    }

    await Receipt.findByIdAndDelete(id);
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || error);
  }
};

export const receiptService = {
  getStats,
  create,
  cancel,
  update,
  getAll,
  getAllPaginated,
  getById,
  getByCode,
  getByBranch,
  getByDateRange,
  getRevenue,
  getDailyRevenue,
  getTopProducts,
  getRevenueByPaymentMethod,
  handlePaymentWebhook,
  checkPaymentStatus,
  markAsError,
  getErrorReceipts,
  getErrorStats,
  deleteErrorReceipt,
};
