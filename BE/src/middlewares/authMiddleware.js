import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import { jwtConfig } from "../config/jwt.js";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer"))
    return next(new ApiError(401, "Unauthorized: No or invalid token"));
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.JWT_SECRET);
    req.user = decoded;
    console.log(req.user);
    next();
  } catch (error) {
    return next(error.message || error);
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
