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
    const filter = {};
    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }
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

const getById = async (req, res, next) => {
  try {
    const product = await productService.getById(req.params.id);
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
    const product = await productService.getByBarcode(req.params.barcode);
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
    const products = await productService.getByName(req.query.name);
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
    await productService.softDelete(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

export const productController = {
  create,
  getAll,
  getById,
  getByBarcode,
  search,
  getByCategory,
  update,
  updateSalePrice,
  remove,
};
