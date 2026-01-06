import { authService } from "../services/authService.js";
import ApiError from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    // Set refresh token in httpOnly cookie
    res.cookie("refresh_token", result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "login successful!",
      data: { user: result.user },
      access_token: result.access_token,
    });
  } catch (error) {
    next(error.message || error);
  }
};
const refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refresh_token || req.body.refresh_token;

    if (!refreshToken) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token not found");
    }

    const result = await authService.refreshToken(refreshToken);

    // Update refresh token in httpOnly cookie
    res.cookie("refresh_token", result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Token refreshed successfully",
      data: { user: result.user },
      access_token: result.access_token,
    });
  } catch (error) {
    next(error.message || error);
  }
};
const logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await authService.logout(userId);

    // Clear refresh token cookie
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error.message || error);
  }
};

export const authController = {
  login,
  logout,
  refreshToken,
};
