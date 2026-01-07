import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js"; 

const create = async (data) => {
  try {
    return await Branch.createBranch(data);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAll = async () => {
  try {
    return await Branch.findAllBranches();
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllPaginated = async (options = {}) => {
  try {
    return await Branch.findAllBranchesPaginated(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getStats = async () => {
  try {
    return await Branch.getBranchStats();
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }
    return await Branch.findBranchById(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByName = async (name) => {
  try {
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    return await Branch.findBranchByName(name);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const update = async (id, data) => {
  try {
    return await Branch.updateBranch(id, data);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const deleteBranch = async (id) => {
  try {
    return await Branch.deleteBranch(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const deleteMany = async (ids) => {
  try {
    return await Branch.deleteManyBranches(ids);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const restore = async (id) => {
  try {
    return await Branch.restoreBranch(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Check xem chi nhánh có dữ liệu liên quan không
 * (hóa đơn, phiếu nhập, tồn kho, nhân viên)
 * Tối ưu: dùng findOne + limit(1) thay vì countDocuments
 */
const checkHasRelatedData = async (branchId) => {
  try {
    const { Receipt } = await import("../models/receiptModel.js");
    const { ImportReceipt } = await import("../models/importReceiptModel.js");
    const { BranchProduct } = await import("../models/branchProductModel.js");
    const { User } = await import("../models/userModel.js");

    // Check song song - chỉ cần biết có tồn tại hay không (nhanh hơn countDocuments)
    const [hasReceipts, hasImportReceipts, hasStock, hasUsers] = await Promise.all([
      Receipt.exists({ branchId }),
      ImportReceipt.exists({ branchId }),
      BranchProduct.exists({ branchId }),
      User.exists({ branchId }),
    ]);

    const hasData = !!(hasReceipts || hasImportReceipts || hasStock || hasUsers);

    return {
      hasData,
      details: {
        receipts: !!hasReceipts,
        importReceipts: !!hasImportReceipts,
        stock: !!hasStock,
        users: !!hasUsers,
      },
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};


const hardDelete = async (id) => {
  try {
    // Kiểm tra chi nhánh tồn tại và đã ngưng hoạt động
    const branch = await Branch.findOne({ _id: id, isDeleted: true });
    if (!branch) {
      throw new ApiError(404, "Chi nhánh không tồn tại hoặc chưa ngưng hoạt động");
    }

    // Kiểm tra có data liên quan không
    const { hasData, details } = await checkHasRelatedData(id);
    if (hasData) {
      const relatedItems = [];
      if (details.receipts) relatedItems.push("hóa đơn");
      if (details.importReceipts) relatedItems.push("phiếu nhập");
      if (details.stock) relatedItems.push("tồn kho");
      if (details.users) relatedItems.push("nhân viên");
      
      throw new ApiError(
        400,
        `Không thể xóa vĩnh viễn. Chi nhánh còn dữ liệu liên quan: ${relatedItems.join(", ")}`
      );
    }

    // Xóa vĩnh viễn
    return await Branch.hardDeleteBranch(id);
  } catch (error) {
    throw error;
  }
};

export const branchService = {
  create,
  getAll,
  getAllPaginated,
  getStats,
  getById,
  getByName,
  update,
  deleteBranch,
  deleteMany,
  restore,
  checkHasRelatedData,
  hardDelete,
};
