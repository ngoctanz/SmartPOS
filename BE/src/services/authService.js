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
    const refresh_token = jwtConfig.generateRefreshToken(payload);

    // update refresh token lên dtb
    await User.updateUser(user._id, { refresh_token });

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
      refresh_token,
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
    await User.updateUser(userId, { refresh_token: null });
    return { message: "Logged out successfully" };
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Lỗi đăng xuất");
  }
};

const refreshToken = async (currentRefreshToken) => {
  try {
    const decoded = jwt.verify(
      currentRefreshToken,
      jwtConfig.JWT_REFRESH_SECRET
    );
    const user = await User.findById(decoded.userId).select(
      "+refresh_token +previous_refresh_token +token_updated_at"
    );

    if (!user) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Refresh token không hợp lệ"
      );
    }

    // Check if current token matches the stored token
    const isCurrentToken = user.refresh_token === currentRefreshToken;
    // Check if it's the previous token (grace period: 30 seconds)
    const isPreviousToken =
      user.previous_refresh_token === currentRefreshToken &&
      user.token_updated_at &&
      Date.now() - new Date(user.token_updated_at).getTime() < 30000;

    if (!isCurrentToken && !isPreviousToken) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Refresh token không hợp lệ"
      );
    }

    // If using previous token, return the current tokens (idempotent)
    if (isPreviousToken && !isCurrentToken) {
      // Decode current token to generate access token
      const currentDecoded = jwt.verify(
        user.refresh_token,
        jwtConfig.JWT_REFRESH_SECRET
      );
      const payload = {
        userId: currentDecoded.userId,
        userName: currentDecoded.userName,
        email: currentDecoded.email,
        role: currentDecoded.role,
        branchId: currentDecoded.branchId, // Thêm branchId vào token
      };
      const access_token = jwtConfig.generateAccessToken(payload);

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
        access_token: access_token,
        refresh_token: user.refresh_token, // Return current token
      };
    }

    // Tạo token mới (rotation - bảo mật hơn)
    const payload = {
      userId: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
      branchId: user.branchId, // Thêm branchId vào token
    };
    const newAccess_token = jwtConfig.generateAccessToken(payload);
    const newRefresh_token = jwtConfig.generateRefreshToken(payload);

    // Update refresh token mới vào DB, lưu token cũ vào previous
    await User.updateUser(user._id, {
      previous_refresh_token: user.refresh_token,
      refresh_token: newRefresh_token,
      token_updated_at: new Date(),
    });

    // Return clean user data
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
      access_token: newAccess_token,
      refresh_token: newRefresh_token,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Refresh token không hợp lệ hoặc đã hết hạn"
    );
  }
};

export const authService = {
  login,
  logout,
  refreshToken,
};
