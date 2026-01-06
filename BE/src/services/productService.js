import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import ApiError from "../utils/apiError.js";

const create = async (data) => {
  try {
    // Validate category exists
    await Category.findCategoryById(data.categoryId);
    return await Product.createProduct(data);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAll = async (filter = {}) => {
  try {
    return await Product.findAllProducts(filter);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Product ID is required!");
    }
    return await Product.findProductById(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByBarcode = async (barcode) => {
  try {
    if (!barcode || barcode.trim() === "") {
      throw new ApiError(400, "Barcode is required!");
    }
    const product = await Product.findProductByBarcode(barcode);
    if (!product) {
      throw new ApiError(404, "Product not found with this barcode");
    }
    return product;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByName = async (name) => {
  try {
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    return await Product.findProductsByName(name);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByCategory = async (categoryId) => {
  try {
    if (!categoryId || categoryId.trim() === "") {
      throw new ApiError(400, "Category ID is required!");
    }
    return await Product.findProductsByCategory(categoryId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const update = async (id, data) => {
  try {
    const { isDeleted, deletedAt, ...safeData } = data;
    // Validate category if updating
    if (safeData.categoryId) {
      await Category.findCategoryById(safeData.categoryId);
    }
    return await Product.updateProduct(id, safeData);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const updateSalePrice = async (id, salePrice) => {
  try {
    if (salePrice < 0) {
      throw new ApiError(400, "Sale price cannot be negative");
    }
    return await Product.updateSalePrice(id, salePrice);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const softDelete = async (id) => {
  try {
    return await Product.softDeleteProduct(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const softDeleteMany = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "Product IDs are required!");
    }
    return await Product.softDeleteManyProducts(ids);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const hardDelete = async (id) => {
  try {
    return await Product.deleteProduct(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const productService = {
  create,
  getAll,
  getById,
  getByBarcode,
  getByName,
  getByCategory,
  update,
  updateSalePrice,
  softDelete,
  softDeleteMany,
  hardDelete,
};
