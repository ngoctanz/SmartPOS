import { StatusCodes } from "http-status-codes";

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = StatusCodes.NOT_FOUND;
  next(error);
};

export const errorHandlingMiddleware = (err, req, res, next) => {
  // Nếu err là chuỗi, chuyển thành object Error
  if (typeof err === "string") {
    err = new Error(err);
  }

  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || "Internal Server Error";

  // Handle MongoDB Duplicate Key Error (11000)
  if (err.code === 11000) {
    statusCode = StatusCodes.BAD_REQUEST;
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue?.[field];

    // Localize field names
    const fieldNames = {
      userName: "Tên đăng nhập",
      email: "Email",
      phone: "Số điện thoại",
    };

    const fieldName = fieldNames[field] || field;
    message = `${fieldName} "${value}" đã tồn tại trong hệ thống`;
  }

  // Handle MongoDB Validation Error
  if (err.name === "ValidationError") {
    statusCode = StatusCodes.BAD_REQUEST;
    const messages = Object.values(err.errors).map((error) => error.message);
    message = messages.join(", ");
  }

  // Handle MongoDB CastError (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = StatusCodes.BAD_REQUEST;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Sử dụng statusCode từ err nếu có
  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  // Biến quản lý những thông tin muốn trả về
  const responseError = {
    success: false,
    statusCode,
    message,
  };

  // Chỉ show stack trace khi development
  if (process.env.NODE_ENV === "dev") {
    responseError.stack = err.stack;
  }

  res.status(statusCode).json(responseError);
};
