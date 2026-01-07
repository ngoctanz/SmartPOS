import { StatusCodes } from "http-status-codes";
import { categoryService } from "../services/categoryService.js";

const create = async (req, res, next) => {
  try {
    const category = await categoryService.create(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Category created successfully!",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    
    // Nếu có params phân trang thì dùng paginated
    if (page || limit || search) {
      const options = {
        search,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      };
      const result = await categoryService.getAllPaginated(options);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Get categories successfully",
        data: result.data,
        pagination: result.pagination,
      });
    }
    
    // Fallback: lấy tất cả (cho các API cũ)
    const categories = await categoryService.getAll();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get categories successfully",
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const category = await categoryService.getById(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get category successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const categories = await categoryService.getByName(req.query.name);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Search categories successfully",
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const category = await categoryService.update(req.params.id, req.body);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Category updated successfully!",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Category deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

const deleteMany = async (req, res, next) => {
  try {
    const { ids } = req.body;
    await categoryService.deleteMany(ids);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Categories deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

export const categoryController = {
  create,
  getAll,
  getById,
  search,
  update,
  remove,
  deleteMany,
};
