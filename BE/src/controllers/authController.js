import { authService } from "../services/authService.js";
import ApiError from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    // Set Access Token in Cookie
    res.cookie("access_token", result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "login successful!",
      data: { user: result.user },
      access_token: result.access_token,
    });
  } catch (error) {
    next(error);
  }
};
const refreshToken = async (req, res, next) => {
  try {
     throw new ApiError(StatusCodes.NOT_IMPLEMENTED, "Refresh token feature is disabled");
  } catch (error) {
    next(error);
  }
};
const logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await authService.logout(userId);

    // Clear access token cookie
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await authService.getMe(userId);
    res.status(StatusCodes.OK).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const authController = {
  login,
  logout,
  refreshToken,
  me,
};
