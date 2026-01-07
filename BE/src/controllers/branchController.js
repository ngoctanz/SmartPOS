import { StatusCodes } from "http-status-codes";
import { branchService } from "../services/branchService.js";

const create = async (req, res, next) => {
  try {
    const branch = await branchService.create(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Branch created successfully!",
      data: branch,
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
      const result = await branchService.getAllPaginated(options);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Get branches successfully",
        data: result.data,
        pagination: result.pagination,
      });
    }
    
    // Fallback: lấy tất cả (cho các API cũ)
    const branches = await branchService.getAll();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get branches successfully",
      results: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const branch = await branchService.getById(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get branch successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const branches = await branchService.getByName(req.query.name);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Search branches successfully",
      results: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const branch = await branchService.update(req.params.id, req.body);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Branch updated successfully!",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await branchService.deleteBranch(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Branch deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

const deleteMany = async (req, res, next) => {
  try {
    const { ids } = req.body;
    await branchService.deleteMany(ids);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Branches deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

export const branchController = {
  create,
  getAll,
  getById,
  search,
  update,
  remove,
  deleteMany,
};
