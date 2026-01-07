import { jwtConfig } from "../config/jwt.js";
import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const login = async (reqBody) => {
  try {
    const { userName, password } = reqBody;
    
    // Tìm user theo userName (case-insensitive)
    const user = await User.findOne({
      userName: { $regex: new RegExp(`^${userName}$`, "i") },
    }).select("+password");
    
    if (!user) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Tài khoản hoặc mật khẩu không chính xác"
      );
    }

    // So sánh password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Tài khoản hoặc mật khẩu không chính xác"
      );
    }

    // Check if account is active
    if (user.status === "inactive") {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ."
      );
    }

    // Check if staff has branch assigned (admin doesn't need branch)
    if (user.role === "staff" && !user.branchId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Tài khoản của bạn chưa được phân công chi nhánh. Vui lòng liên hệ quản trị viên để được cấp quyền truy cập."
      );
    }

    // Tạo JWT Token
    const payload = {
      userId: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };
    const access_token = jwtConfig.generateAccessToken(payload);

    // Return clean user data without sensitive fields
    const userData = {
      _id: user._id,
      userName: user.userName,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      status: user.status,
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
    
    // Also check status when getting current user (for session validation)
    if (user.status === "inactive") {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
      );
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
