import Joi from "joi";
import ApiError from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const correctCondition = Joi.object({
  userName: Joi.string().required().min(3).max(15).trim().strict(),
  password: Joi.string()
    .required()
    .min(6)
    .max(25)
    .pattern(
      new RegExp("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d!@#$%^&*()_+\\-=]{6,25}$")
    )
    .message(
      "Password must contain at least one letter and one number, no spaces."
    )
    .trim()
    .strict(),
  name: Joi.string().max(100).trim().allow(""),
  role: Joi.string().valid("admin", "staff"),
  branchId: Joi.string().allow(null, ""),
  status: Joi.string().valid("active", "inactive"),
});

const createdNew = async (req, res, next) => {
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: true });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(StatusCodes.BAD_REQUEST, errorMessage));
  }
};
const updateUserSchema = Joi.object({
  name: Joi.string().max(100).trim().allow(""),
  password: Joi.string()
    .min(6)
    .max(25)
    .pattern(
      new RegExp("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d!@#$%^&*()_+\\-=]{6,25}$")
    )
    .message(
      "Password must contain at least one letter and one number, no spaces."
    )
    .allow("", null), // Allow empty or null (optional update)
  role: Joi.string().valid("admin", "staff"),
  branchId: Joi.string().allow(null, ""),
  status: Joi.string().valid("active", "inactive"),
})
  .min(1)
  .message("Cần ít nhất một trường để cập nhật");

const validateUpdateData = async (req, res, next) => {
  try {
    await updateUserSchema.validateAsync(req.body, { abortEarly: true });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(StatusCodes.BAD_REQUEST, errorMessage));
  }
};

export const userValidation = {
  createdNew,
  validateUpdateData,
};
