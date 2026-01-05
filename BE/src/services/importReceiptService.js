import { ImportReceipt } from "../models/importReceiptModel.js";
import { Product } from "../models/productModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";
import { getDateRange } from "../utils/calculators.js";

const create = async (data, userId) => {
  try {
    // Validate branch
    await Branch.findBranchById(data.branchId);

    // Prepare list products
    const listProduct = [];
    let totalAmount = 0;

    for (const item of data.listProduct) {
      const product = await Product.findProductById(item.productId);
      const subtotal = item.quantity * item.importPrice;

      listProduct.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        importPrice: item.importPrice,
        subtotal,
      });

      totalAmount += subtotal;
    }

    const receiptData = {
      branchId: data.branchId,
      supplierName: data.supplierName || "",
      createdBy: userId,
      listProduct,
      totalAmount,
      status: "pending",
      note: data.note || "",
    };

    return await ImportReceipt.createImportReceipt(receiptData);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Confirm import receipt
 * - Update stock với giá vốn trung bình mới
 */
const confirm = async (id) => {
  try {
    const receipt = await ImportReceipt.findImportReceiptById(id);

    if (receipt.status === "completed") {
      throw new ApiError(400, "Import receipt already completed");
    }
    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Cannot confirm cancelled receipt");
    }

    const branchId = receipt.branchId._id || receipt.branchId;

    // Update stock cho từng sản phẩm với giá vốn TB mới
    for (const item of receipt.listProduct) {
      await BranchProduct.importStock(
        branchId,
        item.productId,
        item.quantity,
        item.importPrice
      );
    }

    return await ImportReceipt.updateStatus(id, "completed");
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const cancel = async (id) => {
  try {
    const receipt = await ImportReceipt.findImportReceiptById(id);
    if (receipt.status === "completed") {
      throw new ApiError(400, "Cannot cancel completed receipt");
    }
    return await ImportReceipt.updateStatus(id, "cancelled");
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAll = async (filter = {}) => {
  try {
    return await ImportReceipt.findAllImportReceipts(filter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Import receipt ID is required!");
    }
    return await ImportReceipt.findImportReceiptById(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByCode = async (code) => {
  try {
    if (!code || code.trim() === "") {
      throw new ApiError(400, "Code is required!");
    }
    const receipt = await ImportReceipt.findImportReceiptByCode(code);
    if (!receipt) {
      throw new ApiError(404, "Import receipt not found");
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
    return await ImportReceipt.findImportReceiptsByBranch(branchId, filter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByDateRange = async (startDate, endDate, branchId = null) => {
  try {
    return await ImportReceipt.findImportReceiptsByDateRange(
      new Date(startDate),
      new Date(endDate),
      branchId
    );
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getTotalImport = async (period, branchId = null) => {
  try {
    const { startDate, endDate } = getDateRange(period);
    return await ImportReceipt.getTotalImportByDateRange(
      startDate,
      endDate,
      branchId
    );
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const importReceiptService = {
  create,
  confirm,
  cancel,
  getAll,
  getById,
  getByCode,
  getByBranch,
  getByDateRange,
  getTotalImport,
};
