import { StatusCodes } from "http-status-codes";
import { branchProductService } from "../services/branchProductService.js";
import ApiError from "../utils/apiError.js";

const getByBranch = async (req, res, next) => {
  try {
    // Permission check handled by middleware (injectUserBranch validates params.branchId)
    const { search, page, limit, lowStockOnly } = req.query;
    const options = {
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      lowStockOnly: lowStockOnly === "true",
    };
    
    // Pass user for defense-in-depth security
    const result = await branchProductService.getByBranch(req.params.branchId, options, req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get stock by branch successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
    try {
        const { branchId } = req.query;
        // branchId is already injected for staff by middleware
        const stats = await branchProductService.getStats(branchId);
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Get stock stats successfully",
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

const getByProduct = async (req, res, next) => {
  try {
    const stocks = await branchProductService.getByProduct(req.params.productId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get stock by product successfully",
      results: stocks.length,
      data: stocks,
    });
  } catch (error) {
    next(error);
  }
};

const getStock = async (req, res, next) => {
  try {
    const { branchId, productId } = req.params;
    // Permission check handled by middleware

    const stock = await branchProductService.getStock(branchId, productId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get stock successfully",
      data: { branchId, productId, stock },
    });
  } catch (error) {
    next(error);
  }
};

const setMinStock = async (req, res, next) => {
  try {
    const { branchId, productId } = req.params;
    // Permission check handled by middleware

    const { minStock } = req.body;
    const result = await branchProductService.setMinStock(branchId, productId, minStock);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Min stock updated successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getLowStock = async (req, res, next) => {
  try {
    // Pass user for defense-in-depth security
    const lowStockProducts = await branchProductService.getLowStock(req.params.branchId, req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get low stock products successfully",
      results: lowStockProducts.length,
      data: lowStockProducts,
    });
  } catch (error) {
    next(error);
  }
};

const checkAvailability = async (req, res, next) => {
  try {
    const { branchId, productId } = req.params;
    // Permission check handled by middleware

    const { quantity } = req.query;
    const result = await branchProductService.checkStockAvailability(
      branchId,
      productId,
      parseInt(quantity) || 1
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Stock availability checked",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { branchId, search, page, limit, lowStockOnly } = req.query;
    
    // branchId is already injected for staff by middleware
    const options = {
      branchId,
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      lowStockOnly: lowStockOnly === "true",
    };
    
    // Pass user for defense-in-depth security
    const result = await branchProductService.getAll(options, req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get all stock successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get aggregated stock by product (sum across all branches)
 * Only for admin when viewing "All branches"
 */
const getAggregatedByProduct = async (req, res, next) => {
  try {
    const { search, page, limit, lowStockOnly } = req.query;
    
    const options = {
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      lowStockOnly: lowStockOnly === "true",
    };
    
    const result = await branchProductService.getAggregatedByProduct(options);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get aggregated stock by product successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    // branchId đã được inject từ middleware cho staff
    // Pass user for defense-in-depth security
    const data = await branchProductService.create(req.body, req.user);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Stock report created successfully",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    // Pass user for defense-in-depth security
    const data = await branchProductService.update(req.params.id, req.body, req.user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Stock updated successfully",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await branchProductService.deleteStock(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Stock deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const { note, branchId } = req.body;
    // Pass user for defense-in-depth security
    // branchId được inject từ middleware cho staff, hoặc từ body cho admin
    const data = await branchProductService.updateNote(req.params.id, note, req.user, branchId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Note updated successfully",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

const updateSalePrice = async (req, res, next) => {
  try {
    const { salePrice, branchId } = req.body;
    // Pass user for defense-in-depth security
    // branchId được inject từ middleware cho staff, hoặc từ body cho admin
    const data = await branchProductService.updateSalePrice(req.params.id, salePrice, req.user, branchId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Sale price updated successfully",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

export const branchProductController = {
  getStats,
  getAll,
  getAggregatedByProduct,
  getByBranch,
  getByProduct,
  getStock,
  setMinStock,
  getLowStock,
  checkAvailability,
  create,
  update,
  remove,
  updateNote,
  updateSalePrice
};
