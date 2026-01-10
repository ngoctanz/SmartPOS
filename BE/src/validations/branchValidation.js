import Joi from "joi";
import ApiError from "../utils/apiError.js";

const createSchema = Joi.object({
  branchName: Joi.string().required().min(2).max(200).trim(),
  address: Joi.string().required().max(500).trim(),
  contactInfo: Joi.string().max(200).trim().allow(""),
  // PayOS credentials (optional)
  PAYOS_CLIENT_ID: Joi.string().trim().allow(""),
  PAYOS_API_KEY: Joi.string().trim().allow(""),
  PAYOS_CHECKSUM_KEY: Joi.string().trim().allow(""),
});

const updateSchema = Joi.object({
  branchName: Joi.string().min(2).max(200).trim(),
  address: Joi.string().max(500).trim(),
  contactInfo: Joi.string().max(200).trim().allow(""),
  // PayOS credentials (optional)
  PAYOS_CLIENT_ID: Joi.string().trim().allow(""),
  PAYOS_API_KEY: Joi.string().trim().allow(""),
  PAYOS_CHECKSUM_KEY: Joi.string().trim().allow(""),
}).min(1);

const create = async (req, res, next) => {
  try {
    await createSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(400, errorMessage));
  }
};

const update = async (req, res, next) => {
  try {
    await updateSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(400, errorMessage));
  }
};

export const branchValidation = {
  create,
  update,
};
