import { jwtConfig } from "../config/jwt.js";
import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const login = async (reqBody) => {
  try {
    const { userName, password } = reqBody;
    //tìm user theo userName (case-insensitive)
    const user = await User.findOne({
      userName: { $regex: new RegExp(`^${userName}$`, "i") },
    }).select("+password");
    if (!user)
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Tài khoản hoặc mật khẩu không chính xác"
      );

    //so sánh password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid)
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Tài khoản hoặc mật khẩu không chính xác"
      );

    //Tạo JWT Token
    const payload = {
      userId: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
      branchId: user.branchId, // Thêm branchId vào token
    };
    const access_token = jwtConfig.generateAccessToken(payload);
    // Remove refresh token generation

    // Return clean user data without sensitive fields
    const userData = {
      _id: user._id,
      userName: user.userName,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      isActive: user.isActive,
    };

    return {
      user: userData,
      access_token,
    };
  } catch (error) {
    // Re-throw ApiError as-is, wrap others
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Lỗi xử lý đăng nhập"
    );
  }
};

const logout = async (userId) => {
  try {
    // No need to clear refresh token
    return { message: "Logged out successfully" };
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Lỗi đăng xuất");
  }
};


const getMe = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password -__v");
    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not found");
    }
    return user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching user profile");
  }
};

export const authService = {
  login,
  logout,
  getMe,
};
