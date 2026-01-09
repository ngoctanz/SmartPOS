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
    
    // Auto add product to all branches with stock = 0 and salePrice from product
    await BranchProduct.addProductToAllBranches(product._id, product.currentSalePrice || 0);
    
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

const getById = async (id, branchId = null) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Product ID is required!");
    }
    const product = await Product.findProductById(id);
    
    // Map salePrice from branchProduct if branchId provided
    if (branchId && product) {
      const branchProductInfo = await BranchProduct.getProductInfo(branchId, product._id);
      return {
        ...product.toObject ? product.toObject() : product,
        salePrice: branchProductInfo.salePrice || product.currentSalePrice,
        stock: branchProductInfo.stock || 0,
      };
    }
    
    return product;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByBarcode = async (barcode, branchId = null) => {
  try {
    if (!barcode || barcode.trim() === "") {
      throw new ApiError(400, "Barcode is required!");
    }
    const product = await Product.findProductByBarcode(barcode);
    if (!product) {
      throw new ApiError(404, "Product not found with this barcode");
    }
    
    // Map salePrice from branchProduct if branchId provided
    if (branchId) {
      const branchProductInfo = await BranchProduct.getProductInfo(branchId, product._id);
      return {
        ...product.toObject ? product.toObject() : product,
        salePrice: branchProductInfo.salePrice || product.currentSalePrice,
        stock: branchProductInfo.stock || 0,
      };
    }
    
    return product;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByName = async (name, branchId = null) => {
  try {
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    const products = await Product.findProductsByName(name);
    
    // Map salePrice from branchProduct if branchId provided
    if (branchId && products.length > 0) {
      const productsWithPrice = await Promise.all(
        products.map(async (product) => {
          const branchProductInfo = await BranchProduct.getProductInfo(branchId, product._id);
          return {
            ...product.toObject ? product.toObject() : product,
            salePrice: branchProductInfo.salePrice || product.currentSalePrice,
            stock: branchProductInfo.stock || 0,
          };
        })
      );
      return productsWithPrice;
    }
    
    return products;
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

    // Check if images are being updated
    if (data.images && Array.isArray(data.images)) {
      const oldProduct = await Product.findById(id);
      if (oldProduct && oldProduct.images && oldProduct.images.length > 0) {
        // Find images that were removed (exist in old but not in new)
        const removedImages = oldProduct.images.filter(
          (oldImg) => !data.images.includes(oldImg)
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
  getById,
  getByBarcode,
  getByName,
  getByCategory,
  update,
  updateSalePrice,
  remove,
  removeMany,
};
