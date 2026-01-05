import { User } from "../models/userModel.js";
import ApiError from "../utils/apiError.js";

const createdNew = async (reqBody) => {
  try {
    return await User.createUser(reqBody);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllUser = async () => {
  try {
    const users = await User.findAllUsers();
    return users;
  } catch (error) {
    throw new Error(error.message || error);
  }
};
const getUserById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Id is required!");
    }
    const user = await User.findUserById(id);
    return user;
  } catch (error) {
    throw new Error(error.message || error);
  }
};
const getUserByName = async (name) => {
  try {
    console.log(name);
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    const user = await User.findUsersByName(name);
    return user;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const updateUser = async (id, data) => {
  try {
    const { password, refresh_token, isDeleted, role, deletedAt, ...safeData } =
      data;
    const userUpdated = await User.updateUser(id, safeData);
    if (!userUpdated) throw new Error("User not found");
    return userUpdated;
  } catch (error) {
    throw new Error(error.message || error);
  }
};
const deleteUser = async (id) => {
  try {
    return await User.deleteUser(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

export const userService = {
  createdNew,
  getUserById,
  getUserByName,
  getAllUser,
  updateUser,
  deleteUser,
};
