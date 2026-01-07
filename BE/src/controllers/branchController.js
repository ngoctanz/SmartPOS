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
    const { search, page, limit, includeDeleted } = req.query;
    
    // Nếu có params phân trang thì dùng paginated
    if (page || limit || search) {
      const options = {
        search,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        includeDeleted: includeDeleted === 'true',
      };
      const result = await branchService.getAllPaginated(options);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Get branches successfully",
        data: result.data,
        pagination: result.pagination,
      });
    }
    
    // Fallback: lấy tất cả (cho các API cũ) - không bao gồm deleted
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

const getStats = async (req, res, next) => {
  try {
    const stats = await branchService.getStats();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get branch stats successfully",
      data: stats,
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

const restore = async (req, res, next) => {
  try {
    const branch = await branchService.restore(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Branch restored successfully!",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

const checkCanDelete = async (req, res, next) => {
  try {
    const result = await branchService.checkHasRelatedData(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Check related data successfully",
      data: {
        canDelete: !result.hasData,
        ...result,
      },
    });
  } catch (error) {
    next(error);
  }
};

const hardDelete = async (req, res, next) => {
  try {
    await branchService.hardDelete(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Branch permanently deleted!",
    });
  } catch (error) {
    next(error);
  }
};

export const branchController = {
  create,
  getAll,
  getStats,
  getById,
  search,
  update,
  remove,
  deleteMany,
  restore,
  checkCanDelete,
  hardDelete,
};
