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
      const stock = await BranchProduct.getStock(data.branchId, item.productId);

      if (stock < item.quantity) {
        throw new ApiError(
          400,
          `Không đủ hàng cho "${product.name}". Tồn kho: ${stock}, Yêu cầu: ${item.quantity}`
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
};
