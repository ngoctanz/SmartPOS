import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import { Product } from "../models/productModel.js";
import ApiError from "../utils/apiError.js";

const getByBranch = async (branchId) => {
  try {
    if (!branchId || branchId.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }
    await Branch.findBranchById(branchId);
    return await BranchProduct.findByBranch(branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByProduct = async (productId) => {
  try {
    if (!productId || productId.trim() === "") {
      throw new ApiError(400, "Product ID is required!");
    }
    await Product.findProductById(productId);
    return await BranchProduct.findByProduct(productId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getStock = async (branchId, productId) => {
  try {
    return await BranchProduct.getStock(branchId, productId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const setMinStock = async (branchId, productId, minStock) => {
  try {
    if (minStock < 0) {
      throw new ApiError(400, "Min stock cannot be negative");
    }
    return await BranchProduct.setMinStock(branchId, productId, minStock);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getLowStock = async (branchId) => {
  try {
    if (!branchId || branchId.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }
    return await BranchProduct.getLowStockByBranch(branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const checkStockAvailability = async (branchId, productId, quantity) => {
  try {
    const stock = await BranchProduct.getStock(branchId, productId);
    return {
      available: stock >= quantity,
      currentStock: stock,
      requested: quantity,
      shortage: stock < quantity ? quantity - stock : 0,
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const branchProductService = {
  getByBranch,
  getByProduct,
  getStock,
  setMinStock,
  getLowStock,
  checkStockAvailability,
};
