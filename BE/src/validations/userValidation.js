import Joi from "joi";
import ApiError from "../utils/apiError.js";
const correctCondition = Joi.object({
  userName: Joi.string().required().min(3).max(15).trim().strict(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .strict(),
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
});

const createdNew = async (req, res, next) => {
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: true });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(500, errorMessage));
  }
};
const validateUpdateData = (req, res, next) => {
  try {
    const data = req.body;
    if (!data || Object.keys(data) === 0)
      return next(new ApiError(400, "Data is required!"));

    //check id
    const allowedFields = ["email", "username"];
    const hasValidField = allowedFields.some(
      (field) => data[field] !== undefined
    );
    if (!hasValidField)
      return next(new ApiError(400, "No valid fields to update!"));
    next();
  } catch (error) {
    return next(error);
  }
};

export const userValidation = {
  createdNew,
  validateUpdateData,
};
