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
    // Không cho phép update user admin
    const userToUpdate = await userService.getUserById(req.params.id);
    if (
      userToUpdate &&
      userToUpdate.role === "admin" &&
      userToUpdate.userName === "admin"
    ) {
      return next(
        new ApiError(
          StatusCodes.FORBIDDEN,
          "Không thể chỉnh sửa tài khoản admin"
        )
      );
    }

    const updatedUser = await userService.updateUser(req.params.id, req.body);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Cập nhật người dùng thành công!",
      data: updatedUser,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    // Không cho phép xóa user admin
    const userToDelete = await userService.getUserById(req.params.id);
    if (
      userToDelete &&
      userToDelete.role === "admin" &&
      userToDelete.userName === "admin"
    ) {
      return next(
        new ApiError(StatusCodes.FORBIDDEN, "Không thể xóa tài khoản admin")
      );
    }

    await userService.deleteUser(req.params.id);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Xóa người dùng thành công!",
    });
  } catch (error) {
    return next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const result = await userService.toggleUserStatus(userId);

    const statusText = result.status === "active" ? "mở khóa" : "khóa";
    res.status(StatusCodes.OK).json({
      success: true,
      message: `Đã ${statusText} người dùng thành công!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const bulkToggleStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(
        new ApiError(StatusCodes.BAD_REQUEST, "Danh sách ID không hợp lệ")
      );
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return next(
        new ApiError(StatusCodes.BAD_REQUEST, "Trạng thái không hợp lệ")
      );
    }

    const result = await userService.bulkToggleStatus(ids, status);
    const statusText = status === "active" ? "mở khóa" : "khóa";

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Đã ${statusText} ${result.modifiedCount} người dùng thành công!`,
      data: result,
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
  deleteUser,
  toggleUserStatus,
  bulkToggleStatus,
};
