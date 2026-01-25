import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import { cloudinaryService } from "./cloudinaryService.js";
import ApiError from "../utils/apiError.js";

const getPublicIdFromUrl = (url) => {
  try {
    if (!url) return null;
    const splitUrl = url.split("/upload/");
    if (splitUrl.length < 2) return null;
    
    // Get part after /upload/
    let publicIdWithExtension = splitUrl[1];
    
    // Remove version if exists (starts with v and digits followed by /)
    if (publicIdWithExtension.match(/^v\d+\//)) {
      publicIdWithExtension = publicIdWithExtension.replace(/^v\d+\//, "");
    }
    
    // Remove extension
    const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf("."));
    return publicId;
  } catch (error) {
    console.error("Error extracting publicId from URL:", error);
    return null;
  }
};

const create = async (data) => {
  try {
    // Validate category exists
    await Category.findCategoryById(data.categoryId);
    const product = await Product.createProduct(data);
    return product;
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

const getAllPaginated = async (options = {}) => {
  try {
    return await Product.findAllProductsPaginated(options);
      } catch (error) {
    throw new Error(error.message || error);
  }
};

const getStats = async () => {
  try {
    return await Product.getProductStats();
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getCategoryStats = async () => {
  try {
    // Aggregate products by category
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$categoryId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: "$category.name",
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return stats;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id, branchId = null) => {
  try {
    if (!id?.trim()) {
      throw new ApiError(400, "Product ID is required!");
    }
    
    const product = await Product.findProductById(id);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    
    // Nếu có branchId, lấy thông tin giá và tồn kho từ BranchProduct
    if (branchId?.trim()) {
      const branchProductInfo = await BranchProduct.getProductInfo(
        branchId,
        product._id,
      );
      return {
        ...(product.toObject ? product.toObject() : product),
        salePrice: branchProductInfo.salePrice || product.currentSalePrice || 0,
        stock: branchProductInfo.stock || 0,
        lastImportPrice: branchProductInfo.lastImportPrice || 0,
        // Override with branch-specific status
        status: branchProductInfo.status || product.status || "active",
      };
    }
    
    return product;
  } catch (error) {
    throw error instanceof ApiError ? error : new Error(error.message || error);
  }
};

const getByBarcode = async (barcode, branchId = null) => {
  try {
    if (!barcode?.trim()) {
      throw new ApiError(400, "Barcode is required!");
    }
    
    const product = await Product.findProductByBarcode(barcode);
    if (!product) {
      throw new ApiError(404, "Product not found with this barcode");
    }
    
    // Nếu có branchId, lấy thông tin giá và tồn kho từ BranchProduct
    if (branchId?.trim()) {
      const branchProductInfo = await BranchProduct.getProductInfo(
        branchId,
        product._id,
      );
      return {
        ...(product.toObject ? product.toObject() : product),
        salePrice: branchProductInfo.salePrice || product.currentSalePrice || 0,
        stock: branchProductInfo.stock || 0,
        lastImportPrice: branchProductInfo.lastImportPrice || 0,
        // Override with branch-specific status
        status: branchProductInfo.status || product.status || "active",
      };
    }
    
    return product;
  } catch (error) {
    throw error instanceof ApiError ? error : new Error(error.message || error);
  }
};

const getByName = async (name, branchId = null) => {
  try {
    if (!name?.trim()) {
      throw new ApiError(400, "Search name is required!");
    }
    
    const products = await Product.findProductsByName(name, branchId);
    
    // Nếu có branchId, lấy thông tin giá và tồn kho từ BranchProduct
    if (branchId?.trim() && products.length > 0) {
      const productsWithPrice = await Promise.all(
        products.map(async (product) => {
          const branchProductInfo = await BranchProduct.getProductInfo(
            branchId,
            product._id,
          );
          return {
            ...(product.toObject ? product.toObject() : product),
            salePrice: branchProductInfo.salePrice || product.currentSalePrice || 0,
            stock: branchProductInfo.stock || 0,
            lastImportPrice: branchProductInfo.lastImportPrice || 0,
            // Override with branch-specific status
            status: branchProductInfo.status || product.status || "active",
          };
        }),
      );
      return productsWithPrice;
    }
    
    return products;
  } catch (error) {
    throw error instanceof ApiError ? error : new Error(error.message || error);
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
    // Security: Ensure no one can update pricing fields via product API
    // Pricing should be updated via stock API for branch-specific prices
    if (data.currentSalePrice !== undefined) {
      console.warn(`Warning: Updating currentSalePrice via product API for product ${id}`);
    }

    // Strip out any branch-specific fields that shouldn't be here
    const { branchId, productCode, importPrice, ...cleanData } = data;

    // Validate category if updating
    if (cleanData.categoryId) {
      await Category.findCategoryById(cleanData.categoryId);
    }

    // Validate status if provided
    if (cleanData.status && !["active", "inactive"].includes(cleanData.status)) {
      throw new ApiError(400, "Invalid status value. Must be 'active' or 'inactive'");
    }

    // Check if images are being updated
    if (cleanData.images && Array.isArray(cleanData.images)) {
      const oldProduct = await Product.findById(id);
      if (oldProduct && oldProduct.images && oldProduct.images.length > 0) {
        // Find images that were removed (exist in old but not in new)
        const removedImages = oldProduct.images.filter(
          (oldImg) => !cleanData.images.includes(oldImg)
        );
        
        // Delete removed images from Cloudinary
        if (removedImages.length > 0) {
          const publicIds = removedImages
            .map((url) => getPublicIdFromUrl(url))
            .filter((id) => id !== null);
          
          if (publicIds.length > 0) {
            await cloudinaryService.deleteMultipleImages(publicIds);
          }
        }
      }
    }

    // Update product
    const updatedProduct = await Product.updateProduct(id, cleanData);

    // CRITICAL: If Product.status (global status) is being updated,
    // cascade the change to ALL BranchProduct.status (branch-specific statuses)
    if (cleanData.status !== undefined) {
      console.log(`Cascading Product.status update to all branches for product ${id}: ${cleanData.status}`);
      await BranchProduct.updateMany(
        { "products.productId": id },
        { $set: { "products.$[elem].status": cleanData.status } },
        { arrayFilters: [{ "elem.productId": id }] }
      );
    }

    return updatedProduct;
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

const remove = async (id) => {
  try {
    const product = await Product.findById(id);
    if (product && product.images && product.images.length > 0) {
      const publicIds = product.images
        .map((url) => getPublicIdFromUrl(url))
        .filter((id) => id !== null);
      
      if (publicIds.length > 0) {
        await cloudinaryService.deleteMultipleImages(publicIds);
      }
    }
    
    return await Product.deleteProduct(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const removeMany = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "Product IDs are required!");
    }

    // Find all products to be deleted to get their images
    const products = await Product.find({ _id: { $in: ids } });
    
    // Collect all image URLs from all products
    const allImageUrls = products
      .filter(p => p.images && p.images.length > 0)
      .flatMap(p => p.images);
    
    // Extract public IDs and delete from Cloudinary
    if (allImageUrls.length > 0) {
      const publicIds = allImageUrls
        .map((url) => getPublicIdFromUrl(url))
        .filter((id) => id !== null);
      
      if (publicIds.length > 0) {
        await cloudinaryService.deleteMultipleImages(publicIds);
      }
    }

    return await Product.deleteManyProducts(ids);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const productService = {
  create,
  getAll,
  getAllPaginated,
  getStats,
  getCategoryStats,
  getById,
  getByBarcode,
  getByName,
  getByCategory,
  update,
  updateSalePrice,
  remove,
  removeMany,
};
