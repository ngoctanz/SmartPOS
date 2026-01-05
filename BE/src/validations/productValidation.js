import Joi from "joi";
import ApiError from "../utils/apiError.js";

const createSchema = Joi.object({
  categoryId: Joi.string().required().hex().length(24),
  name: Joi.string().required().min(2).max(200).trim(),
  desc: Joi.string().max(1000).trim().allow(""),
  barcode: Joi.string().trim().allow(""),
  unit: Joi.string().required().trim(),
  image: Joi.string().trim().allow(""),
  currentSalePrice: Joi.number().min(0).required(),
});

const updateSchema = Joi.object({
  categoryId: Joi.string().hex().length(24),
  name: Joi.string().min(2).max(200).trim(),
  desc: Joi.string().max(1000).trim().allow(""),
  barcode: Joi.string().trim().allow(""),
  unit: Joi.string().trim(),
  image: Joi.string().trim().allow(""),
  currentSalePrice: Joi.number().min(0),
}).min(1);

const updatePriceSchema = Joi.object({
  salePrice: Joi.number().min(0).required(),
});

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

const updatePrice = async (req, res, next) => {
  try {
    await updatePriceSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") || error.message;
    return next(new ApiError(400, errorMessage));
  }
};

export const productValidation = {
  create,
  update,
  updatePrice,
};
