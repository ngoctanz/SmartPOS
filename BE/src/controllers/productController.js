import { StatusCodes } from "http-status-codes";
import { productService } from "../services/productService.js";

const create = async (req, res, next) => {
  try {
    const product = await productService.create(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Product created successfully!",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { search, categoryId, status, page, limit } = req.query;
    
    // Nếu có params phân trang thì dùng paginated
    if (page || limit || search) {
      const options = {
        search,
        categoryId,
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      };
      const result = await productService.getAllPaginated(options);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Get products successfully",
        data: result.data,
        pagination: result.pagination,
      });
    }
    
    // Fallback: lấy tất cả (cho các API cũ)
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    const products = await productService.getAll(filter);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get products successfully",
      results: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await productService.getStats();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get product stats successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryStats = async (req, res, next) => {
  try {
    const stats = await productService.getCategoryStats();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get category stats successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};


const getById = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const product = await productService.getById(req.params.id, branchId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get product successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const getByBarcode = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const product = await productService.getByBarcode(req.params.barcode, branchId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get product successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const { name, branchId } = req.query;
    const products = await productService.getByName(name, branchId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Search products successfully",
      results: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

const getByCategory = async (req, res, next) => {
  try {
    const products = await productService.getByCategory(req.params.categoryId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get products by category successfully",
      results: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product updated successfully!",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const updateSalePrice = async (req, res, next) => {
  try {
    const product = await productService.updateSalePrice(
      req.params.id,
      req.body.salePrice
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Sale price updated successfully!",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await productService.remove(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

const removeMany = async (req, res, next) => {
  try {
    const { ids } = req.body;
    await productService.removeMany(ids);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Products deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

export const productController = {
  create,
  getAll,
  getStats,
  getCategoryStats,
  getById,
  getByBarcode,
  search,
  getByCategory,
  update,
  updateSalePrice,
  remove,
  removeMany,
};
