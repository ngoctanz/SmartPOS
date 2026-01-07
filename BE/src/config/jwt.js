import jwt from "jsonwebtoken";
import "dotenv/config";
// Kiểm tra bắt buộc có JWT secrets
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d"; // Enforce 7d as requested

const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};
export const jwtConfig = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateAccessToken,
};
