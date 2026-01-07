import { ImportReceipt } from "../models/importReceiptModel.js";
import { Product } from "../models/productModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";
import { getDateRange } from "../utils/calculators.js";
import { validateBranchAccess, buildSecureFilter, validateRecordAccess } from "../utils/branchSecurity.js";

const create = async (data, user) => {
  try {
    // Defense-in-depth: Double check branch access
    validateBranchAccess(user, data.branchId, "create import receipt for");
    
    // Validate branch exists
    await Branch.findBranchById(data.branchId);

    // Prepare list products
    const listProduct = [];
    let totalAmount = 0;

    for (const item of data.listProduct) {
      const product = await Product.findProductById(item.productId);
      const subtotal = item.quantity * item.importPrice;

      listProduct.push({
        productId: product._id,
        barcode: product.barcode || "",
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
      createdBy: user.userId,
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

    // Increase stock for each product
    for (const item of receipt.listProduct) {
      await BranchProduct.increaseStock(
        branchId,
        item.productId,
        item.quantity
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

const getAll = async (filter = {}, user = null) => {
  try {
    // Defense-in-depth: Apply secure filter if user provided
    const secureFilter = user ? buildSecureFilter(user, filter) : filter;
    return await ImportReceipt.findAllImportReceipts(secureFilter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllPaginated = async (options = {}, user = null) => {
  try {
    // Defense-in-depth: Ensure branchId filter for staff
    if (user && user.role !== 'admin' && user.branchId) {
      options.branchId = user.branchId;
    }
    return await ImportReceipt.findAllImportReceiptsPaginated(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id, user = null) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Import receipt ID is required!");
    }
    const receipt = await ImportReceipt.findImportReceiptById(id);
    
    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "import receipt");
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
    const receipt = await ImportReceipt.findImportReceiptByCode(code);
    if (!receipt) {
      throw new ApiError(404, "Import receipt not found");
    }
    
    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "import receipt");
    }
    
    return receipt;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByBarcode = async (barcode, user = null) => {
  try {
    if (!barcode || barcode.trim() === "") {
      throw new ApiError(400, "Barcode is required!");
    }
    const receipt = await ImportReceipt.findImportReceiptByBarcode(barcode);
    if (!receipt) {
      throw new ApiError(404, "Import receipt not found");
    }
    
    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "import receipt");
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
  getAllPaginated,
  getById,
  getByCode,
  getByBarcode,
  getByBranch,
  getByDateRange,
  getTotalImport,
};
