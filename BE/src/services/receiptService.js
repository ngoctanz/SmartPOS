import { Receipt } from "../models/receiptModel.js";
import { Product } from "../models/productModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";
import { getDateRange } from "../utils/calculators.js";
import { payosService } from "./payosService.js";

const getStats = async (branchId) => {
    try {
        return await Receipt.getStats(branchId);
    } catch (error) {
        throw new Error(error.message || error);
    }
};

const create = async (data, userId) => {
  try {
    // Validate branch
    await Branch.findBranchById(data.branchId);

    const listProduct = [];
    let totalAmount = 0;

    // Validate stock và prepare list
    for (const item of data.listProduct) {
      const product = await Product.findProductById(item.productId);
      const stock = await BranchProduct.getStock(data.branchId, item.productId);

      if (stock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for ${product.name}. Available: ${stock}, Requested: ${item.quantity}`
        );
      }

      const salePrice = item.salePrice || product.currentSalePrice;
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
      createdBy: userId,
      listProduct,
      totalAmount,
      paymentMethod: data.paymentMethod || "cash",
      status: initialStatus,
    };

    // If transfer payment, create PayOS payment link
    if (isTransfer) {
      const orderCode = payosService.generateOrderCode();
      const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";

      const paymentResult = await payosService.createPaymentLink({
        orderCode,
        amount: Math.round(totalAmount),
        description: `Thanh toan don hang SmartPOS`,
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
          status: "pending",
        };
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

const getAll = async (filter = {}) => {
  try {
    return await Receipt.findAllReceipts(filter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Receipt ID is required!");
    }
    return await Receipt.findReceiptById(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByCode = async (code) => {
  try {
    if (!code || code.trim() === "") {
      throw new ApiError(400, "Code is required!");
    }
    const receipt = await Receipt.findReceiptByCode(code);
    if (!receipt) {
      throw new ApiError(404, "Receipt not found");
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
    // Verify webhook data
    const verifiedData = payosService.verifyPaymentWebhookData(webhookData);
    if (!verifiedData) {
      throw new ApiError(400, "Invalid webhook signature");
    }

    const { orderCode } = verifiedData;
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      console.log(`Receipt not found for orderCode: ${orderCode}`);
      return { success: true }; // Return success to prevent PayOS from retrying
    }

    // Check if payment was successful (code "00" means success)
    if (webhookData.code === "00" && webhookData.success) {
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

      console.log(`Payment confirmed for receipt: ${receipt.code}`);
    } else {
      // Payment failed or cancelled
      await Receipt.updatePaymentStatus(orderCode, "cancelled", "cancelled");
      console.log(`Payment failed/cancelled for receipt: ${receipt.code}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Webhook handling error:", error);
    throw new Error(error.message || error);
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

export const receiptService = {
  getStats,
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
  getRevenueByPaymentMethod,
  handlePaymentWebhook,
  checkPaymentStatus,
};
