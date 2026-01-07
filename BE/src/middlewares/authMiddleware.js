import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import { jwtConfig } from "../config/jwt.js";

export const authMiddleware = (req, res, next) => {
  let token;

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];
  }

  // 2. Check cookie if no header
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return next(new ApiError(401, "Unauthorized: No or invalid token"));
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return next(new ApiError(401, "Unauthorized: Invalid token"));
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden: You do not have permission"));
    }
    next();
  };
};
