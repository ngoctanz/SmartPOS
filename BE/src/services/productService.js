import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
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

const getStats = async () => {
  try {
    return await Product.getProductStats();
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
    // Validate category if updating
    if (data.categoryId) {
      await Category.findCategoryById(data.categoryId);
    }

    // Check if image is being updated
    if (data.image) {
      const oldProduct = await Product.findById(id);
      if (oldProduct && oldProduct.image && oldProduct.image !== data.image) {
        const publicId = getPublicIdFromUrl(oldProduct.image);
        if (publicId) {
          await cloudinaryService.deleteImage(publicId);
        }
      }
    }

    return await Product.updateProduct(id, data);
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
    if (product && product.image) {
      const publicId = getPublicIdFromUrl(product.image);
      if (publicId) {
        await cloudinaryService.deleteImage(publicId);
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
    
    // Delete images from Cloudinary
    const deleteImagePromises = products
      .filter(p => p.image)
      .map(p => {
        const publicId = getPublicIdFromUrl(p.image);
        return publicId ? cloudinaryService.deleteImage(publicId) : Promise.resolve();
      });
      
    await Promise.allSettled(deleteImagePromises);

    return await Product.deleteManyProducts(ids);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const productService = {
  create,
  getAll,
  getStats,
  getById,
  getByBarcode,
  getByName,
  getByCategory,
  update,
  updateSalePrice,
  remove,
  removeMany,
};
