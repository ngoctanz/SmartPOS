import { StatusCodes } from "http-status-codes";
import { userService } from "../services/userService.js";
import ApiError from "../utils/apiError.js";

const createdNew = async (req, res, next) => {
  try {
    const createdUser = await userService.createdNew(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User created successfully!",
      data: createdUser,
    });
  } catch (error) {
    next(error);
  }
};

const detailUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get user details successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const searchUser = async (req, res, next) => {
  try {
    const users = await userService.getUserByName(req.query.name);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get user details successfully",
      results: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

const getAllUser = async (req, res, next) => {
  try {
    const users = await userService.getAllUser();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get users successfully",
      result: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
const updateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "update user is successful!",
      response: updatedUser,
    });
  } catch (error) {
    return next(error);
  }
};

export const userController = {
  createdNew,
  detailUser,
  searchUser,
  getAllUser,
  updateUser,
};
