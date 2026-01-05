import { authService } from "../services/authService.js";
import ApiError from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "login successful!",
      data: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
  } catch (error) {
    next(error.message || error);
  }
};
const refreshToken = async (req, res, next) => {
  try {
    const result = await authService.refreshToken(req.body.refresh_token);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Token refreshed successfully",
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
  } catch (error) {
    next(error.message || error);
  }
};
const logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await authService.logout(userId);
    res.status(StatusCodes.OK).json({
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
