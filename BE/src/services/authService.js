import { jwtConfig } from "../config/jwt.js";
import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
const login = async (reqBody) => {
  try {
    const { userName, password } = reqBody;
    //tìm user theo userName (case-insensitive)
    const user = await User.findOne({
      userName: { $regex: new RegExp(`^${userName}$`, "i") },
    }).select("+password");
    if (!user) throw new Error("Invalid credentials");

    //so sánh password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new Error("Invalid credentials");

    //Tạo JWT Token
    const payload = {
      userId: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
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
    throw new Error(error);
  }
};

const logout = async (userId) => {
  try {
    await User.updateUser(userId, { refresh_token: null });
    return { message: "Logged out successfully" };
  } catch (error) {
    throw new Error(error);
  }
};

const refreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, jwtConfig.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select("+refresh_token");
    if (!user || user.refresh_token !== refreshToken)
      throw new Error("Invalid refresh token");

    //khởi tạo lại token
    const payload = {
      userId: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
    };
    const newAccess_token = jwtConfig.generateAccessToken(payload);
    const newRefresh_token = jwtConfig.generateRefreshToken(payload);

    // update refresh token lên dtb
    await User.updateUser(user._id, {
      refresh_token: newRefresh_token,
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
    throw new Error("Invalid or expired refresh token");
  }
};

export const authService = {
  login,
  logout,
  refreshToken,
};
