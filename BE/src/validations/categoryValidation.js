import Joi from "joi";
import ApiError from "../utils/apiError.js";

const createSchema = Joi.object({
  name: Joi.string().required().min(2).max(100).trim(),
  desc: Joi.string().max(500).trim().allow(""),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  desc: Joi.string().max(500).trim().allow(""),
}).min(1);

const create = async (req, res, next) => {
  try {
    await createSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") || error.message;
    return next(new ApiError(400, errorMessage));
  }
};

const update = async (req, res, next) => {
  try {
    await updateSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") || error.message;
    return next(new ApiError(400, errorMessage));
  }
};

export const categoryValidation = {
  create,
  update,
};
