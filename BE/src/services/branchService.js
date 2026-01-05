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
    const { isDeleted, deletedAt, ...safeData } = data;
    return await Branch.updateBranch(id, safeData);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const softDelete = async (id) => {
  try {
    return await Branch.softDeleteBranch(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const hardDelete = async (id) => {
  try {
    return await Branch.deleteBranch(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const branchService = {
  create,
  getAll,
  getById,
  getByName,
  update,
  softDelete,
  hardDelete,
};
