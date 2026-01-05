import rateLimit from "express-rate-limit";

// Helper tạo rate limiter đơn giản
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000 / 60) + " minutes",
    },
    standardHeaders: false,
    legacyHeaders: false,
  });
};

// Login - 5 lần trong 15 phút
export const loginLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many login attempts, please try again later"
);

// Refresh token - 20 lần trong 10 phút
export const refreshLimiter = createLimiter(
  10 * 60 * 1000,
  20,
  "Too many refresh attempts, please try again later"
);

// Register - 3 lần trong 1 giờ
export const registerLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  "Too many registration attempts, please try again later"
);

// General auth - 100 lần trong 15 phút
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  100,
  "Too many requests to auth endpoints"
);
