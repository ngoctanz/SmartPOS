import { Receipt } from "../models/receiptModel.js";
import { Product } from "../models/productModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";
import { getDateRange } from "../utils/calculators.js";

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

    // Create receipt
    const receiptData = {
      branchId: data.branchId,
      createdBy: userId,
      listProduct,
      totalAmount,
      paymentMethod: data.paymentMethod || "cash",
      status: "completed",
    };

    const receipt = await Receipt.createReceipt(receiptData);

    // Decrease stock
    for (const item of listProduct) {
      await BranchProduct.decreaseStock(data.branchId, item.productId, item.quantity);
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
      await BranchProduct.increaseStock(branchId, item.productId, item.quantity);
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
    return await Receipt.getTopSellingProducts(startDate, endDate, branchId, limit);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getRevenueByPaymentMethod = async (period, branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await Receipt.getRevenueByPaymentMethod(startDate, endDate, branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const receiptService = {
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
};
