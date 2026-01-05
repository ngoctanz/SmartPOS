import { StatusCodes } from "http-status-codes";
import { branchProductService } from "../services/branchProductService.js";

const getByBranch = async (req, res, next) => {
  try {
    const stocks = await branchProductService.getByBranch(req.params.branchId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get stock by branch successfully",
      results: stocks.length,
      data: stocks,
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
    const lowStockProducts = await branchProductService.getLowStock(req.params.branchId);
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

export const branchProductController = {
  getByBranch,
  getByProduct,
  getStock,
  setMinStock,
  getLowStock,
  checkAvailability,
};
