import { Receipt } from "../models/receiptModel.js";
import { Product } from "../models/productModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";
import { payosService } from "./payosService.js";
import { socketService } from "./socketService.js";
import {
  validateBranchAccess,
  buildSecureFilter,
  validateRecordAccess,
} from "../utils/branchSecurity.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper: Get branch PayOS credentials
const getBranchPayOSCredentials = async (branchId) => {
  const branch = await Branch.findBranchById(branchId);

  const credentials = {
    PAYOS_CLIENT_ID: branch.PAYOS_CLIENT_ID,
    PAYOS_API_KEY: branch.PAYOS_API_KEY,
    PAYOS_CHECKSUM_KEY: branch.PAYOS_CHECKSUM_KEY,
  };

  const isConfigured =
    credentials.PAYOS_CLIENT_ID &&
    credentials.PAYOS_API_KEY &&
    credentials.PAYOS_CHECKSUM_KEY;

  return { branch, credentials, isConfigured };
};

// Helper: Cancel PayOS link silently (ignore errors)
const cancelPayOSLinkSilently = async (orderCode, reason, credentials) => {
  try {
    await payosService.cancelPaymentLink(orderCode, reason, credentials);
    console.log(`[PayOS] Link ${orderCode} cancelled: ${reason}`);
    return true;
  } catch (e) {
    console.log(`[PayOS] Could not cancel link ${orderCode}: ${e.message}`);
    return false;
  }
};

// Helper: Populate receipt with branch and user info for response
const populateReceipt = async (receiptId) => {
  return Receipt.findById(receiptId)
    .populate("branchId", "branchName address")
    .populate("createdBy", "userName name")
    .lean();
};

// Helper: Get date range for period
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date();
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      endDate = new Date();
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      endDate = new Date();
      break;
    case "3month":
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      endDate = new Date();
      break;
    case "6month":
      startDate = new Date(now.setMonth(now.getMonth() - 6));
      endDate = new Date();
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      endDate = new Date();
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      endDate = new Date();
  }

  return { startDate, endDate };
};

// ============================================================================
// QR PREVIEW FUNCTIONS (NEW FLOW - Creates draft receipt)
// ============================================================================

/**
 * Create QR preview for transfer payment
 * Creates a draft receipt + PayOS link
 * Draft receipts are auto-deleted after 15 minutes
 */
const createQRPreview = async (data, user) => {
  try {
    // 1. Validate branchId
    const branchId = data.branchId;
    if (!branchId) {
      throw new ApiError(400, "branchId is required");
    }

    // 2. Validate branch access
    validateBranchAccess(user, branchId, "create QR preview for");

    // 3. Get branch and validate PayOS config
    const { credentials, isConfigured } = await getBranchPayOSCredentials(
      branchId
    );
    if (!isConfigured) {
      throw new ApiError(
        400,
        "Chi nhánh chưa cấu hình PayOS. Vui lòng liên hệ quản trị viên."
      );
    }

    // 4. Validate listProduct
    if (!Array.isArray(data.listProduct) || data.listProduct.length === 0) {
      throw new ApiError(400, "Danh sách sản phẩm không được trống");
    }

    // 5. Prepare product list and calculate total
    const listProduct = [];
    let totalAmount = 0;

    for (const item of data.listProduct) {
      if (!item.productId) {
        throw new ApiError(400, "productId không được trống");
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new ApiError(400, "Số lượng sản phẩm phải lớn hơn 0");
      }
      if (
        item.salePrice === undefined ||
        item.salePrice === null ||
        item.salePrice < 0
      ) {
        throw new ApiError(400, "Giá sản phẩm không hợp lệ");
      }

      // Validate product exists
      const product = await Product.findProductById(item.productId);

      listProduct.push({
        productId: product._id,
        productName: item.productName || product.name,
        quantity: item.quantity,
        salePrice: item.salePrice,
      });

      totalAmount += item.salePrice * item.quantity;
    }

    if (totalAmount <= 0) {
      throw new ApiError(400, "Tổng tiền phải lớn hơn 0");
    }

    // 6. Generate PayOS payment link
    const orderCode = payosService.generateOrderCode();
    const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const paymentDescription = `HD${orderCode}`.slice(0, 25);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    let paymentResult;
    try {
      paymentResult = await payosService.createPaymentLink(
        {
          orderCode,
          amount: Math.round(totalAmount),
          description: paymentDescription,
          returnUrl: `${baseUrl}/trang-quan-ly/hoa-don`,
          cancelUrl: `${baseUrl}/trang-quan-ly/hoa-don`,
          expiredAt: expiresAt,
        },
        credentials
      );
    } catch (payosError) {
      console.error("[QR Preview] PayOS error:", payosError.message);
      throw new ApiError(500, `Lỗi tạo mã QR: ${payosError.message}`);
    }

    if (!paymentResult?.success || !paymentResult?.data) {
      throw new ApiError(500, "Không thể tạo mã QR thanh toán");
    }

    // 7. Create draft receipt in database
    const receiptData = {
      branchId,
      createdBy: user.userId,
      listProduct,
      totalAmount: Math.round(totalAmount),
      customerPaid: Math.round(totalAmount), // Transfer: customerPaid = totalAmount
      paymentMethod: "transfer",
      status: "draft", // Draft status - not visible in lists
      paymentInfo: {
        orderCode,
        linkId: paymentResult.data.paymentLinkId,
        qrCode: paymentResult.data.qrCode,
        checkoutUrl: paymentResult.data.checkoutUrl,
        accountNumber: paymentResult.data.accountNumber,
        accountName: paymentResult.data.accountName,
        bin: paymentResult.data.bin,
        amount: Math.round(totalAmount),
        description: paymentDescription,
        status: "pending",
      },
    };

    const receipt = await Receipt.createReceipt(receiptData);

    console.log(
      `[QR Preview] Created draft receipt ${receipt.code} with orderCode: ${orderCode}`
    );

    return {
      orderCode,
      receiptCode: receipt.code,
      receiptId: receipt._id,
      totalAmount: receipt.totalAmount,
      paymentInfo: receipt.paymentInfo,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[QR Preview] Create error:", error);
    throw new ApiError(500, error.message || "Lỗi tạo mã QR thanh toán");
  }
};

/**
 * Cancel QR preview - Delete draft receipt
 */
const cancelQRPreview = async (orderCode, user) => {
  try {
    // 1. Find draft receipt by orderCode
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      // Already deleted or doesn't exist - return success (idempotent)
      console.log(`[QR Preview] Cancel: orderCode ${orderCode} not found`);
      return { success: true, message: "Receipt not found or already deleted" };
    }

    // 2. Only allow deleting draft receipts
    if (receipt.status !== "draft") {
      // If already pending/completed, don't delete
      console.log(
        `[QR Preview] Cannot delete non-draft receipt ${receipt.code} (status: ${receipt.status})`
      );
      return { success: true, message: "Receipt already confirmed" };
    }

    // 3. Validate ownership
    const branchId = receipt.branchId._id || receipt.branchId;
    validateBranchAccess(user, branchId, "cancel QR preview for");

    // 4. Cancel PayOS link (best effort)
    try {
      const { credentials } = await getBranchPayOSCredentials(branchId);
      await cancelPayOSLinkSilently(orderCode, "User cancelled", credentials);
    } catch (e) {
      console.log(`[QR Preview] Could not cancel PayOS link: ${e.message}`);
    }

    // 5. Delete draft receipt (not cancelled - just delete it)
    await Receipt.findByIdAndDelete(receipt._id);

    console.log(`[QR Preview] Deleted draft receipt ${receipt.code}`);

    return { success: true, message: "QR preview deleted" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[QR Preview] Cancel error:", error);
    throw new ApiError(500, error.message || "Lỗi hủy mã QR");
  }
};

/**
 * Get QR preview data by orderCode
 */
const getQRPreview = async (orderCode, user) => {
  try {
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      throw new ApiError(404, "Mã QR không tồn tại hoặc đã hết hạn");
    }

    // Validate ownership
    const branchId = receipt.branchId._id || receipt.branchId;
    validateBranchAccess(user, branchId, "view QR preview for");

    // Check if expired (15 minutes)
    const createdAt = new Date(receipt.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);

    if (new Date() > expiresAt && receipt.status === "draft") {
      throw new ApiError(404, "Mã QR đã hết hạn");
    }

    return {
      orderCode: receipt.paymentInfo?.orderCode || orderCode,
      receiptCode: receipt.code,
      receiptId: receipt._id,
      totalAmount: receipt.totalAmount,
      listProduct: receipt.listProduct,
      paymentInfo: receipt.paymentInfo,
      expiresAt,
      status: receipt.status,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[QR Preview] Get error:", error);
    throw new ApiError(500, error.message || "Lỗi lấy thông tin mã QR");
  }
};

/**
 * Confirm QR preview - Updates draft receipt to pending
 * Called when staff clicks "Hoàn thành" in QR preview dialog
 */
const confirmQRPreview = async (orderCode, user) => {
  try {
    // 1. Find draft receipt
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      throw new ApiError(404, "Mã QR không tồn tại hoặc đã hết hạn");
    }

    // 2. Validate ownership
    const branchId = receipt.branchId._id || receipt.branchId;
    validateBranchAccess(user, branchId, "confirm QR preview for");

    // 3. Check current status
    if (receipt.status === "completed") {
      // Already paid via webhook - return success
      console.log(`[QR Preview] Receipt ${receipt.code} already completed`);
      return receipt;
    }

    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Mã QR đã bị hủy");
    }

    if (receipt.status === "pending") {
      // Already confirmed - return success (idempotent)
      return receipt;
    }

    // 4. Check if expired
    const createdAt = new Date(receipt.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);

    if (new Date() > expiresAt) {
      // Update to cancelled
      await Receipt.updateStatus(receipt._id, "cancelled");
      await Receipt.findByIdAndUpdate(receipt._id, {
        "paymentInfo.status": "expired",
      });
      throw new ApiError(400, "Mã QR đã hết hạn. Vui lòng tạo mã QR mới.");
    }

    // 5. Update status from draft to pending
    const updatedReceipt = await Receipt.findByIdAndUpdate(
      receipt._id,
      { status: "pending" },
      { new: true }
    )
      .populate("branchId", "branchName address")
      .populate("createdBy", "userName name")
      .lean();

    console.log(
      `[QR Preview] Confirmed receipt ${receipt.code} - now pending payment`
    );

    return updatedReceipt;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[QR Preview] Confirm error:", error);
    throw new ApiError(500, error.message || "Lỗi xác nhận hóa đơn");
  }
};

/**
 * Update QR preview - Cancel old draft and create new one
 */
const updateQRPreview = async (orderCode, data, user) => {
  try {
    // 1. Get branchId BEFORE cancelling (since cancel deletes the receipt)
    const oldReceipt = await Receipt.findReceiptByOrderCode(orderCode);
    const branchId = oldReceipt
      ? oldReceipt.branchId._id || oldReceipt.branchId
      : data.branchId;

    if (!branchId) {
      throw new ApiError(400, "branchId is required");
    }

    // 2. Cancel old preview (deletes draft receipt)
    await cancelQRPreview(orderCode, user);

    // 3. Create new preview with updated data
    return await createQRPreview(
      {
        branchId,
        listProduct: data.listProduct,
      },
      user
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[QR Preview] Update error:", error);
    throw new ApiError(500, error.message || "Lỗi cập nhật mã QR");
  }
};

// ============================================================================
// RECEIPT CRUD FUNCTIONS
// ============================================================================

const getStats = async (branchId, period, startDate, endDate) => {
  try {
    return await Receipt.getStats(branchId, period, startDate, endDate);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Create receipt (for cash payment only in new flow)
 * Transfer payments use createQRPreview -> confirmQRPreview flow
 */
const create = async (data, user) => {
  try {
    // Defense-in-depth: Double check branch access
    validateBranchAccess(user, data.branchId, "create receipt for");

    // Validate branch exists
    const branch = await Branch.findBranchById(data.branchId);

    const listProduct = [];
    let totalAmount = 0;

    // Validate and prepare product list
    for (const item of data.listProduct) {
      const product = await Product.findProductById(item.productId);

      // Get price from BranchProduct or Product
      const productInfo = await BranchProduct.getProductInfo(
        data.branchId,
        item.productId
      );

      const salePrice =
        item.salePrice ??
        productInfo.salePrice ??
        product.currentSalePrice ??
        0;
      const subtotal = salePrice * item.quantity;

      listProduct.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        salePrice,
      });

      totalAmount += subtotal;
    }

    if (data.paymentMethod === "cash") {
      const customerPaid =
        data.customerPaid != null && data.customerPaid >= totalAmount
          ? data.customerPaid
          : totalAmount;

      const receipt = await Receipt.createReceipt({
        branchId: data.branchId,
        createdBy: user.userId,
        listProduct,
        totalAmount,
        customerPaid,
        paymentMethod: "cash",
        status: "completed",
      });

      for (const item of listProduct) {
        await BranchProduct.decreaseStock(
          data.branchId,
          item.productId,
          item.quantity
        );
      }

      return populateReceipt(receipt._id);
    }

    if (data.paymentMethod === "transfer") {
      const { credentials, isConfigured } = await getBranchPayOSCredentials(
        data.branchId
      );

      if (!isConfigured) {
        throw new ApiError(400, "Chi nhánh chưa cấu hình PayOS.");
      }

      const orderCode = payosService.generateOrderCode();
      const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const paymentDescription = `HD${orderCode}`.slice(0, 25);

      const paymentResult = await payosService.createPaymentLink(
        {
          orderCode,
          amount: Math.round(totalAmount),
          description: paymentDescription,
          returnUrl: `${baseUrl}/trang-quan-ly/hoa-don`,
          cancelUrl: `${baseUrl}/trang-quan-ly/hoa-don`,
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        credentials
      );

      const receiptData = {
        branchId: data.branchId,
        createdBy: user.userId,
        listProduct,
        totalAmount,
        customerPaid: totalAmount, // Transfer: customerPaid = totalAmount
        paymentMethod: "transfer",
        status: "pending",
        paymentInfo: {
          orderCode,
          linkId: paymentResult.data?.paymentLinkId,
          qrCode: paymentResult.data?.qrCode,
          checkoutUrl: paymentResult.data?.checkoutUrl,
          accountNumber: paymentResult.data?.accountNumber,
          accountName: paymentResult.data?.accountName,
          bin: paymentResult.data?.bin,
          amount: Math.round(totalAmount),
          description: paymentDescription,
          status: "pending",
        },
      };

      const receipt = await Receipt.createReceipt(receiptData);
      return populateReceipt(receipt._id);
    }

    throw new ApiError(400, "Invalid payment method");
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const cancel = async (id, user) => {
  try {
    const receipt = await Receipt.findReceiptById(id);

    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Receipt already cancelled");
    }

    const branchId = receipt.branchId._id || receipt.branchId;

    // Validate access
    if (user) {
      validateBranchAccess(user, branchId, "cancel receipt for");
    }

    // Only restore stock if receipt was completed
    if (receipt.status === "completed") {
      for (const item of receipt.listProduct) {
        await BranchProduct.increaseStock(
          branchId,
          item.productId,
          item.quantity
        );
      }
    }

    // Cancel PayOS link if transfer payment
    if (
      receipt.paymentMethod === "transfer" &&
      receipt.paymentInfo?.orderCode
    ) {
      try {
        const { credentials } = await getBranchPayOSCredentials(branchId);
        await cancelPayOSLinkSilently(
          receipt.paymentInfo.orderCode,
          "Receipt cancelled",
          credentials
        );
      } catch (e) {
        console.log(`[Cancel] Could not cancel PayOS link: ${e.message}`);
      }
    }

    return await Receipt.updateStatus(id, "cancelled");
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAll = async (filter = {}, user = null) => {
  try {
    const secureFilter = user ? buildSecureFilter(user, filter) : filter;
    return await Receipt.findAllReceipts(secureFilter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllPaginated = async (options = {}, user = null) => {
  try {
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

// ============================================================================
// WEBHOOK & PAYMENT FUNCTIONS
// ============================================================================

/**
 * Handle PayOS webhook callback
 * Handles both draft and pending receipts
 * Uses atomic operations to prevent race conditions
 */
const handlePaymentWebhook = async (webhookData) => {
  try {
    console.log("[Webhook] Received:", JSON.stringify(webhookData, null, 2));

    const orderCode = webhookData.data?.orderCode;
    if (!orderCode) {
      console.log("[Webhook] No orderCode found");
      return { success: true, message: "No orderCode" };
    }

    // Find receipt by orderCode (could be draft or pending)
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      console.log(`[Webhook] Receipt not found for orderCode: ${orderCode}`);
      return { success: true };
    }

    // Get branch credentials for verification
    const branchId = receipt.branchId._id || receipt.branchId;

    let branch;
    try {
      branch = await Branch.findBranchById(branchId);
    } catch (branchError) {
      console.error(
        `[Webhook] Branch not found for receipt ${receipt.code}:`,
        branchError.message
      );
      return { success: true, message: "Branch not found" };
    }

    if (!branch) {
      console.log(`[Webhook] Branch ${branchId} not found`);
      return { success: true, message: "Branch not found" };
    }

    const branchCredentials = {
      PAYOS_CLIENT_ID: branch.PAYOS_CLIENT_ID,
      PAYOS_API_KEY: branch.PAYOS_API_KEY,
      PAYOS_CHECKSUM_KEY: branch.PAYOS_CHECKSUM_KEY,
    };

    // Verify webhook signature
    let verifiedData;
    try {
      verifiedData = await payosService.verifyPaymentWebhookData(
        webhookData,
        branchCredentials
      );
    } catch (verifyError) {
      console.log("[Webhook] Verification error:", verifyError.message);
      return { success: true, message: "Verification failed" };
    }

    if (!verifiedData) {
      console.log("[Webhook] Invalid signature, skipping...");
      return { success: true, message: "Invalid signature" };
    }

    // Parse webhook data
    const code = webhookData.code;
    const success = webhookData.success;
    const payosStatus = webhookData.data?.status || verifiedData.status;
    const currentStatus = receipt.status;

    console.log(
      `[Webhook] Processing receipt ${receipt.code}: code=${code}, success=${success}, payosStatus=${payosStatus}, currentStatus=${currentStatus}`
    );

    // Handle successful payment - use atomic update to prevent race condition
    if (code === "00" && success) {
      // Atomic update: only update if status is draft or pending (not already completed/cancelled)
      const updateResult = await Receipt.findOneAndUpdate(
        {
          _id: receipt._id,
          status: { $in: ["draft", "pending"] }, // Only update if not already processed
        },
        {
          status: "completed",
          "paymentInfo.status": "paid",
        },
        { new: true }
      );

      // If no document was updated, it was already processed
      if (!updateResult) {
        console.log(
          `[Webhook] Receipt ${receipt.code} already processed, skipping stock update`
        );
        return { success: true, message: "Already processed" };
      }

      // Decrease stock (only runs if atomic update succeeded)
      try {
        for (const item of receipt.listProduct) {
          await BranchProduct.decreaseStock(
            branchId,
            item.productId,
            item.quantity
          );
        }
      } catch (stockError) {
        console.error(
          `[Webhook] Stock decrease error for ${receipt.code}:`,
          stockError.message
        );
        // Don't throw - payment is already confirmed, log for manual review
      }

      console.log(`[Webhook] ✓ Payment confirmed for receipt: ${receipt.code}`);

      // Broadcast payment success (best effort)
      try {
        socketService.broadcastPaymentSuccess(branchId.toString(), {
          receiptCode: receipt.code,
          amount: receipt.totalAmount,
          timestamp: new Date().toISOString(),
          fromDraft: currentStatus === "draft", // Flag if payment was from draft (QR preview)
        });
      } catch (socketError) {
        console.log(`[Webhook] Socket broadcast error: ${socketError.message}`);
      }

      return { success: true, message: "Payment confirmed" };
    }

    // Handle expired/cancelled/failed - helper function to reduce duplication
    const handleFailure = async (paymentStatus, logMessage) => {
      try {
        if (currentStatus === "draft") {
          await Receipt.findByIdAndDelete(receipt._id);
          console.log(
            `[Webhook] ✗ Deleted ${logMessage} draft receipt: ${receipt.code}`
          );
        } else if (currentStatus === "pending") {
          await Receipt.findByIdAndUpdate(receipt._id, {
            status: "cancelled",
            "paymentInfo.status": paymentStatus,
          });
          console.log(`[Webhook] ✗ ${logMessage} for receipt: ${receipt.code}`);
        }
        // If already completed/cancelled, do nothing
      } catch (failureError) {
        console.error(
          `[Webhook] Handle failure error: ${failureError.message}`
        );
      }
    };

    // Handle expired
    if (payosStatus === "EXPIRED" || code === "expired") {
      await handleFailure("expired", "Payment expired");
      return { success: true, message: "Payment expired" };
    }

    // Handle cancelled
    if (payosStatus === "CANCELLED" || code === "cancelled") {
      await handleFailure("cancelled", "Payment cancelled");
      return { success: true, message: "Payment cancelled" };
    }

    // Other failures
    await handleFailure("cancelled", `Payment failed (code: ${code})`);
    return { success: true, message: "Payment failed" };
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return { success: true, error: error.message };
  }
};

/**
 * Check payment status from PayOS
 * Uses atomic operations to prevent race conditions
 */
const checkPaymentStatus = async (orderCode) => {
  try {
    const receipt = await Receipt.findReceiptByOrderCode(orderCode);

    if (!receipt) {
      throw new ApiError(404, "Receipt not found");
    }

    const branchId = receipt.branchId._id || receipt.branchId;
    const branch = await Branch.findBranchById(branchId);

    const branchCredentials = {
      PAYOS_CLIENT_ID: branch.PAYOS_CLIENT_ID,
      PAYOS_API_KEY: branch.PAYOS_API_KEY,
      PAYOS_CHECKSUM_KEY: branch.PAYOS_CHECKSUM_KEY,
    };

    const paymentInfo = await payosService.getPaymentInfo(
      orderCode,
      branchCredentials
    );
    const currentStatus = receipt.status;

    // Handle PAID status - use atomic update
    if (
      paymentInfo.status === "PAID" &&
      receipt.paymentInfo?.status !== "paid"
    ) {
      // Atomic update: only update if not already completed
      const updateResult = await Receipt.findOneAndUpdate(
        {
          _id: receipt._id,
          status: { $in: ["draft", "pending"] },
        },
        {
          status: "completed",
          "paymentInfo.status": "paid",
        },
        { new: true }
      );

      // Decrease stock only if atomic update succeeded
      if (updateResult) {
        for (const item of receipt.listProduct) {
          await BranchProduct.decreaseStock(
            branchId,
            item.productId,
            item.quantity
          );
        }
      }
    }
    // Handle CANCELLED status
    else if (
      paymentInfo.status === "CANCELLED" &&
      currentStatus !== "cancelled"
    ) {
      await Receipt.findByIdAndUpdate(receipt._id, {
        status: "cancelled",
        "paymentInfo.status": "cancelled",
      });
    }
    // Handle EXPIRED status
    else if (paymentInfo.status === "EXPIRED") {
      if (currentStatus === "draft") {
        await Receipt.findByIdAndDelete(receipt._id);
      } else if (currentStatus === "pending") {
        await Receipt.findByIdAndUpdate(receipt._id, {
          status: "cancelled",
          "paymentInfo.status": "expired",
        });
      }
    }

    // Return fresh receipt data (or null if deleted)
    const updatedReceipt = await Receipt.findReceiptByOrderCode(orderCode);
    return {
      paymentStatus: paymentInfo.status,
      receipt: updatedReceipt,
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

// ============================================================================
// UPDATE & ERROR FUNCTIONS
// ============================================================================

const update = async (id, data, user) => {
  try {
    const receipt = await Receipt.findReceiptById(id);

    if (!receipt) {
      throw new ApiError(404, "Receipt not found");
    }

    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Cannot update cancelled receipt");
    }

    const branchId = receipt.branchId._id || receipt.branchId;

    if (user) {
      validateBranchAccess(user, branchId, "update receipt for");
    }

    // If updating products, handle stock adjustments
    if (data.listProduct && receipt.status === "completed") {
      const oldProducts = new Map(
        receipt.listProduct.map((p) => [p.productId.toString(), p.quantity])
      );

      // Validate stock for increased quantities
      for (const item of data.listProduct) {
        const product = await Product.findProductById(item.productId);
        const oldQty = oldProducts.get(item.productId.toString()) || 0;
        const qtyDiff = item.quantity - oldQty;

        if (qtyDiff > 0) {
          const stock = await BranchProduct.getStock(branchId, item.productId);
          if (stock < qtyDiff) {
            throw new ApiError(
              400,
              `Insufficient stock for ${product.name}. Available: ${stock}, Additional needed: ${qtyDiff}`
            );
          }
        }
      }

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
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      throw new ApiError(404, "Không tìm thấy hóa đơn");
    }

    const branchId = receipt.branchId._id || receipt.branchId;
    validateBranchAccess(user, branchId, "mark error for");

    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Không thể đánh dấu lỗi cho hóa đơn đã hủy");
    }

    if (receipt.isError) {
      throw new ApiError(400, "Hóa đơn đã được đánh dấu lỗi trước đó");
    }

    // Return products to stock only if receipt was completed
    if (receipt.status === "completed") {
      for (const item of receipt.listProduct) {
        await BranchProduct.increaseStock(
          branchId,
          item.productId,
          item.quantity
        );
      }
    }

    // Update receipt
    receipt.isError = true;
    receipt.markedErrorBy = userId;
    receipt.markedErrorAt = new Date();
    receipt.errorReason = errorReason || null;
    await receipt.save();

    const populatedReceipt = await Receipt.findById(receiptId)
      .populate("branchId", "branchName address")
      .populate("createdBy", "userName name")
      .populate("markedErrorBy", "userName name")
      .lean();

    return populatedReceipt;
  } catch (error) {
    throw error;
  }
};

/**
 * Get error receipts with pagination
 */
const getErrorReceipts = async (options, user) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      branchId,
      sortBy = "markedErrorAt",
      sortOrder = "desc",
    } = options;

    const query = { isError: true };

    if (search && search.trim()) {
      query.code = { $regex: search, $options: "i" };
    }

    if (user.role === "staff" || user.role === "manager") {
      query.branchId = user.branchId;
    } else if (branchId) {
      query.branchId = branchId;
    }

    const total = await Receipt.countDocuments(query);
    const skip = (page - 1) * limit;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const data = await Receipt.find(query)
      .populate("branchId", "branchName address")
      .populate("createdBy", "userName name")
      .populate("markedErrorBy", "userName name")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

    if (user.role === "staff" || user.role === "manager") {
      query.branchId = user.branchId;
    } else if (branchId) {
      query.branchId = branchId;
    }

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

    const recentErrors = await Receipt.find(query)
      .select("code totalAmount markedErrorAt")
      .sort({ markedErrorAt: -1 })
      .limit(5)
      .lean();

    return { ...totals, errorsByBranch, recentErrors };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Delete error receipt
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

    const branchId = receipt.branchId._id || receipt.branchId;

    if (user.role === "manager") {
      if (!user.branchId || user.branchId.toString() !== branchId.toString()) {
        throw new ApiError(
          403,
          "Bạn không có quyền xóa hóa đơn lỗi của chi nhánh khác"
        );
      }
    }

    await Receipt.findByIdAndDelete(id);
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || error);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const receiptService = {
  // Stats
  getStats,

  // QR Preview (new flow)
  createQRPreview,
  cancelQRPreview,
  getQRPreview,
  confirmQRPreview,
  updateQRPreview,

  // CRUD
  create,
  cancel,
  update,
  getAll,
  getAllPaginated,
  getById,
  getByCode,
  getByBranch,
  getByDateRange,

  // Revenue
  getRevenue,
  getDailyRevenue,
  getTopProducts,
  getRevenueByPaymentMethod,

  // Payment
  handlePaymentWebhook,
  checkPaymentStatus,

  // Error receipts
  markAsError,
  getErrorReceipts,
  getErrorStats,
  deleteErrorReceipt,
};
