import { ImportReceipt } from "../models/importReceiptModel.js";
import { Product } from "../models/productModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";
import { getDateRange } from "../utils/calculators.js";
import { validateBranchAccess, buildSecureFilter, validateRecordAccess } from "../utils/branchSecurity.js";


const getStats = async (branchId) => {
    try {
        return await ImportReceipt.getStats(branchId);
    } catch (error) {
        throw new Error(error.message || error);
    }
};

const getErrorStats = async (branchId) => {
    try {
        return await ImportReceipt.getErrorStats(branchId);
    } catch (error) {
        throw new Error(error.message || error);
    }
};

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
      const quantity = item.quantity || 0;
      const subtotal = quantity * item.importPrice;

      listProduct.push({
        productId: product._id,
        barcode: product.barcode || "",
        productName: product.name,
        quantity,
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

const confirm = async (id, user = null) => {
  try {
    const receipt = await ImportReceipt.findImportReceiptById(id);

    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "import receipt");
    }

    if (receipt.isError) {
      throw new ApiError(400, "Cannot confirm error receipt");
    }
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

const cancel = async (id, user = null) => {
  try {
    const receipt = await ImportReceipt.findImportReceiptById(id);
    
    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "import receipt");
    }
    
    if (receipt.status === "completed") {
      throw new ApiError(400, "Cannot cancel completed receipt");
    }
    if (receipt.isError) {
      throw new ApiError(400, "Cannot cancel error receipt");
    }
    return await ImportReceipt.updateStatus(id, "cancelled");
  } catch (error) {
    throw new Error(error.message || error);
  }
};

// Đánh dấu phiếu lỗi và hoàn lại kho
const markAsError = async (id, errorNote, user) => {
  try {
    const receipt = await ImportReceipt.findImportReceiptById(id);
    
    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "import receipt");
    }
    
    if (receipt.isError) {
      throw new ApiError(400, "Receipt is already marked as error");
    }
    
    if (receipt.status === "cancelled") {
      throw new ApiError(400, "Cannot mark cancelled receipt as error");
    }

    // Check thời gian tạo phiếu - chỉ cho phép đánh dấu lỗi trong vòng 30 phút
    const createdAt = new Date(receipt.createdAt);
    const now = new Date();
    const diffInMinutes = (now - createdAt) / (1000 * 60);
    
    if (diffInMinutes > 30) {
      throw new ApiError(400, "Chỉ có thể đánh dấu lỗi trong vòng 30 phút sau khi tạo phiếu");
    }

    const branchId = receipt.branchId._id || receipt.branchId;

    // Nếu phiếu đã completed, hoàn lại kho (cho phép âm kho)
    if (receipt.status === "completed") {
      for (const item of receipt.listProduct) {
        // decreaseStock cho phép âm kho
        await BranchProduct.decreaseStock(
          branchId,
          item.productId,
          item.quantity
        );
      }
    }

    return await ImportReceipt.markAsError(id, errorNote, user.userId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

// Lấy danh sách phiếu lỗi
const getAllErrorReceipts = async (filter = {}, user = null) => {
  try {
    const secureFilter = user ? buildSecureFilter(user, filter) : filter;
    return await ImportReceipt.findAllErrorReceipts(secureFilter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllErrorReceiptsPaginated = async (options = {}, user = null) => {
  try {
    if (user && user.role !== 'admin' && user.branchId) {
      options.branchId = user.branchId;
    }
    return await ImportReceipt.findAllErrorReceiptsPaginated(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

// Xóa phiếu lỗi (admin và manager)
const deleteErrorReceipt = async (id, user = null) => {
  try {
    const receipt = await ImportReceipt.findImportReceiptById(id);
    
    if (!receipt.isError) {
      throw new ApiError(400, "Can only delete error receipts");
    }
    
    // Defense-in-depth: Validate access if user provided
    if (user) {
      validateRecordAccess(user, receipt, "import receipt");
      
      // Manager can only delete error receipts in their branch
      if (user.role === "manager") {
        const branchId = receipt.branchId?._id || receipt.branchId;
        if (!user.branchId || user.branchId.toString() !== branchId.toString()) {
          throw new ApiError(403, "Bạn không có quyền xóa phiếu nhập lỗi của chi nhánh khác");
        }
      }
    }
    
    return await ImportReceipt.deleteErrorReceipt(id);
  } catch (error) {
    if (error instanceof ApiError) throw error;
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
  getStats,
  getErrorStats,
  create,
  confirm,
  cancel,
  markAsError,
  getAllErrorReceipts,
  getAllErrorReceiptsPaginated,
  deleteErrorReceipt,
  getAll,
  getAllPaginated,
  getById,
  getByCode,
  getByBarcode,
  getByBranch,
  getByDateRange,
  getTotalImport,
};
