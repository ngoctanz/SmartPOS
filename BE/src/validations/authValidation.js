import Joi from "joi";
import ApiError from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const loginCondition = Joi.object({
  userName: Joi.string().required().min(3).max(15).trim().strict(),
  password: Joi.string().required().min(6).max(25).trim().strict(),
});
const login = async (req, res, next) => {
  try {
    await loginCondition.validateAsync(req.body, { abortEarly: true });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(StatusCodes.BAD_REQUEST, errorMessage));
  }
};
export const authValidation = {
  login,
};
