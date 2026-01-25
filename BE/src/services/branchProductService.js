import { BranchProduct } from "../models/branchProductModel.js";
import { Branch } from "../models/branchModel.js";
import { Product } from "../models/productModel.js";
import ApiError from "../utils/apiError.js";
import {
  validateBranchAccess,
  buildSecureFilter,
} from "../utils/branchSecurity.js";

const getStats = async (branchId) => {
  try {
    return await BranchProduct.getStats(branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByBranch = async (branchId, options = {}, user = null) => {
  try {
    if (!branchId || branchId.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }

    // Defense-in-depth: Validate branch access
    if (user) {
      validateBranchAccess(user, branchId, "view stock for");
    }

    await Branch.findBranchById(branchId);
    return await BranchProduct.findByBranch(branchId, options);
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

const getLowStock = async (branchId, user = null) => {
  try {
    if (!branchId || branchId.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }

    // Defense-in-depth: Validate branch access
    if (user) {
      validateBranchAccess(user, branchId, "view low stock for");
    }

    return await BranchProduct.getLowStockByBranch(branchId);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByBarcode = async (branchId, barcode, user = null) => {
  try {
    if (!branchId || branchId.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }
    if (!barcode || barcode.trim() === "") {
      throw new ApiError(400, "Barcode is required!");
    }

    // Defense-in-depth: Validate branch access
    if (user) {
      validateBranchAccess(user, branchId, "search stock for");
    }

    const result = await BranchProduct.findByBarcode(branchId, barcode);
    if (!result) {
      throw new ApiError(404, "Sản phẩm không có trong kho chi nhánh này");
    }
    return result;
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

const getAll = async (options = {}, user = null) => {
  try {
    // Defense-in-depth: Apply secure filter if user provided
    if (user && user.role !== "admin" && user.branchId) {
      options.branchId = user.branchId;
    }
    return await BranchProduct.findAll(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Get aggregated stock by product (sum across all branches)
 * Only for admin when viewing "All branches"
 */
const getAggregatedByProduct = async (options = {}) => {
  try {
    return await BranchProduct.findAggregatedByProduct(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const create = async (data, user = null) => {
  try {
    // data: { branchId, items: [{ productId, stock, minStock }] }
    let { branchId, items, productId, stock, minStock } = data;

    if (!items && productId) {
      items = [{ productId, stock, minStock }];
    }

    if (!branchId || !items || items.length === 0) {
      throw new ApiError(400, "Branch and items are required");
    }

    // Defense-in-depth: Validate branch access
    if (user) {
      validateBranchAccess(user, branchId, "create stock for");
    }

    return await BranchProduct.bulkUpdateStock(branchId, items);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

/**
 * Create a new product and add it to a specific branch's stock
 * Admin only - for creating products directly for a specific branch
 * @param {Object} data - Product data + branch info
 * @param {Object} user - User making the request
 */
const createProductWithStock = async (data, user = null) => {
  try {
    const {
      // Product fields
      name,
      barcode,
      categoryId,
      unit,
      currentSalePrice,
      status,
      desc,
      images,
      // Branch stock fields
      branchId,
      productCode,
      salePrice,
      importPrice,
      minStock = 5,
    } = data;

    if (!branchId) {
      throw new ApiError(400, "Branch ID is required for admin");
    }

    if (!name || !categoryId || !unit) {
      throw new ApiError(400, "Product name, category and unit are required");
    }

    // Import Product model dynamically to avoid circular dependency
    const { Product: ProductModel } = await import("../models/productModel.js");
    const { Category } = await import("../models/categoryModel.js");

    // Validate category exists
    await Category.findCategoryById(categoryId);

    // Validate branch exists
    await Branch.findBranchById(branchId);

    // Create Product first
    const productData = {
      name,
      barcode,
      categoryId,
      unit,
      currentSalePrice: currentSalePrice || salePrice || 0,
      status: status || "active",
      desc,
      images,
    };

    const product = await ProductModel.createProduct(productData);

    // Now add to branch stock with the specified details
    let branchDoc = await BranchProduct.findOne({ branchId });
    if (!branchDoc) {
      branchDoc = new BranchProduct({ branchId, products: [] });
    }

    // Add the new product to this branch
    branchDoc.products.push({
      productId: product._id,
      productCode: productCode || "",
      stock: 0, // Default stock is 0
      minStock: minStock,
      salePrice: salePrice || currentSalePrice || 0,
      lastImportPrice: importPrice || 0,
    });

    await branchDoc.save();

    return {
      product,
      branchProduct: {
        branchId,
        productId: product._id,
        productCode,
        stock: 0,
        minStock,
        salePrice: salePrice || currentSalePrice || 0,
        lastImportPrice: importPrice || 0,
      },
    };
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const update = async (id, data, user = null) => {
  try {
    // First, find the document to check branch access
    const branchProduct = await BranchProduct.findOne({ "products._id": id });
    if (!branchProduct) throw new Error("Stock record not found");

    // Defense-in-depth: Validate branch access if user provided
    if (user) {
      validateBranchAccess(user, branchProduct.branchId, "update stock for");
    }

    // Prepare update fields
    const updateFields = {};
    if (data.stock !== undefined) updateFields["products.$.stock"] = data.stock;
    if (data.minStock !== undefined)
      updateFields["products.$.minStock"] = data.minStock;
    if (data.salePrice !== undefined)
      updateFields["products.$.salePrice"] = data.salePrice;
    if (data.lastImportPrice !== undefined)
      updateFields["products.$.lastImportPrice"] = data.lastImportPrice;
    if (data.productCode !== undefined)
      updateFields["products.$.productCode"] = data.productCode;
    if (data.note !== undefined) updateFields["products.$.note"] = data.note;

    // Update single item by sub-document ID
    const result = await BranchProduct.findOneAndUpdate(
      { "products._id": id },
      { $set: updateFields },
      { new: true },
    );
    return result;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const deleteStock = async (id) => {
  try {
    const result = await BranchProduct.findOneAndUpdate(
      { "products._id": id },
      { $pull: { products: { _id: id } } },
      { new: true },
    );
    if (!result) throw new Error("Stock record not found");
    return result;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const updateNote = async (id, note, user = null, branchId = null) => {
  try {
    // First, find the document to check branch access
    const branchProduct = await BranchProduct.findOne({ "products._id": id });
    if (!branchProduct) throw new Error("Stock record not found");

    // Defense-in-depth: Validate branch access
    if (user) {
      // Admin: phải truyền branchId và branchId phải khớp với record
      if (user.role === "admin") {
        if (!branchId) {
          throw new ApiError(400, "branchId is required for admin");
        }
        // Validate branchId khớp với record
        if (branchId.toString() !== branchProduct.branchId.toString()) {
          throw new ApiError(
            400,
            "branchId does not match the stock record's branch",
          );
        }
      } else {
        // Staff: validate branch access bằng branchId của user
        validateBranchAccess(user, branchProduct.branchId, "update note for");
      }
    }

    return await BranchProduct.updateNote(id, note);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const updateSalePrice = async (id, salePrice, user = null, branchId = null) => {
  try {
    if (salePrice < 0) {
      throw new ApiError(400, "Sale price cannot be negative");
    }

    // First, find the document to check branch access
    const branchProduct = await BranchProduct.findOne({ "products._id": id });
    if (!branchProduct) throw new Error("Stock record not found");

    // Defense-in-depth: Validate branch access
    if (user) {
      // Admin: phải truyền branchId và branchId phải khớp với record
      if (user.role === "admin") {
        if (!branchId) {
          throw new ApiError(400, "branchId is required for admin");
        }
        // Validate branchId khớp với record
        if (branchId.toString() !== branchProduct.branchId.toString()) {
          throw new ApiError(
            400,
            "branchId does not match the stock record's branch",
          );
        }
      } else {
        // Staff: validate branch access bằng branchId của user
        validateBranchAccess(
          user,
          branchProduct.branchId,
          "update sale price for",
        );
      }
    }

    return await BranchProduct.updateSalePrice(id, salePrice);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const updateMinStock = async (id, minStock, user = null, branchId = null) => {
  try {
    if (minStock < 0) {
      throw new ApiError(400, "Min stock cannot be negative");
    }

    // First, find the document to check branch access
    const branchProduct = await BranchProduct.findOne({ "products._id": id });
    if (!branchProduct) throw new Error("Stock record not found");

    // Defense-in-depth: Validate branch access
    if (user) {
      // Admin: phải truyền branchId và branchId phải khớp với record
      if (user.role === "admin") {
        if (!branchId) {
          throw new ApiError(400, "branchId is required for admin");
        }
        // Validate branchId khớp với record
        if (branchId.toString() !== branchProduct.branchId.toString()) {
          throw new ApiError(
            400,
            "branchId does not match the stock record's branch",
          );
        }
      } else {
        // Staff: validate branch access bằng branchId của user
        validateBranchAccess(
          user,
          branchProduct.branchId,
          "update min stock for",
        );
      }
    }

    return await BranchProduct.updateMinStock(id, minStock);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const updateStatus = async (id, status, user = null, branchId = null) => {
  try {
    if (!["active", "inactive"].includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }

    // First, find the document to check branch access
    const branchProduct = await BranchProduct.findOne({ "products._id": id });
    if (!branchProduct) throw new Error("Stock record not found");

    // Defense-in-depth: Validate branch access
    if (user) {
      // Admin: phải truyền branchId và branchId phải khớp với record
      if (user.role === "admin") {
        if (!branchId) {
          throw new ApiError(400, "branchId is required for admin");
        }
        // Validate branchId khớp với record
        if (branchId.toString() !== branchProduct.branchId.toString()) {
          throw new ApiError(
            400,
            "branchId does not match the stock record's branch",
          );
        }
      } else {
        // Staff: validate branch access bằng branchId của user
        validateBranchAccess(
          user,
          branchProduct.branchId,
          "update status for",
        );
      }
    }

    return await BranchProduct.updateStatus(id, status);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const branchProductService = {
  getStats,
  getAll,
  getAggregatedByProduct,
  getByBranch,
  getByProduct,
  getStock,
  setMinStock,
  getLowStock,
  getByBarcode,
  checkStockAvailability,
  create,
  createProductWithStock,
  update,
  deleteStock,
  updateNote,
  updateSalePrice,
  updateMinStock,
  updateStatus,
};
