import { Category } from "../models/categoryModel.js";
import ApiError from "../utils/apiError.js";

const create = async (data) => {
  try {
    return await Category.createCategory(data);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAll = async () => {
  try {
    return await Category.findAllCategories();
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Category ID is required!");
    }
    return await Category.findCategoryById(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getByName = async (name) => {
  try {
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    return await Category.findCategoryByName(name);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const update = async (id, data) => {
  try {
    return await Category.updateCategory(id, data);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const deleteCategory = async (id) => {
  try {
    return await Category.deleteCategory(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const deleteMany = async (ids) => {
  try {
    return await Category.deleteManyCategories(ids);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const hardDelete = async (id) => {
  try {
    return await Category.deleteCategory(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const categoryService = {
  create,
  getAll,
  getById,
  getByName,
  update,
  deleteCategory,
  deleteMany,
};
