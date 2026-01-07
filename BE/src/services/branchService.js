import { Branch } from "../models/branchModel.js";
import ApiError from "../utils/apiError.js";

const create = async (data) => {
  try {
    return await Branch.createBranch(data);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAll = async () => {
  try {
    return await Branch.findAllBranches();
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllPaginated = async (options = {}) => {
  try {
    return await Branch.findAllBranchesPaginated(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Branch ID is required!");
    }
    return await Branch.findBranchById(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByName = async (name) => {
  try {
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    return await Branch.findBranchByName(name);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const update = async (id, data) => {
  try {
    return await Branch.updateBranch(id, data);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const deleteBranch = async (id) => {
  try {
    return await Branch.deleteBranch(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const deleteMany = async (ids) => {
  try {
    return await Branch.deleteManyBranches(ids);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const branchService = {
  create,
  getAll,
  getAllPaginated,
  getById,
  getByName,
  update,
  deleteBranch,
  deleteMany,
};
