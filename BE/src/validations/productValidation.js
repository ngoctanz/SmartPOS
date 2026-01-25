import Joi from "joi";
import ApiError from "../utils/apiError.js";

// Schema for creating new products
// Note: branchId, productCode, importPrice are stripped - use stock API for branch-specific data
const createSchema = Joi.object({
  categoryId: Joi.string().required().hex().length(24),
  name: Joi.string().required().min(2).max(200).trim(),
  desc: Joi.string().max(1000).trim().allow(""),
  barcode: Joi.string().trim().allow(""),
  unit: Joi.string().required().trim(),
  images: Joi.array().items(Joi.string().trim()).default([]),
  currentSalePrice: Joi.number().min(0).required(),
  status: Joi.string().valid("active", "inactive").default("active"),
  // Optional fields - will be stripped if present (not used in product creation)
  branchId: Joi.any().strip(),
  productCode: Joi.any().strip(),
  importPrice: Joi.any().strip(),
});

// Schema for updating existing products
// Note: Only common product fields allowed. Use stock API for branch-specific pricing.
const updateSchema = Joi.object({
  categoryId: Joi.string().hex().length(24),
  name: Joi.string().min(2).max(200).trim(),
  desc: Joi.string().max(1000).trim().allow(""),
  barcode: Joi.string().trim().allow(""),
  unit: Joi.string().trim(),
  images: Joi.array().items(Joi.string().trim()),
  currentSalePrice: Joi.number().min(0),
  status: Joi.string().valid("active", "inactive"),
  // Optional fields - will be stripped (not used in product update, use stock API instead)
  branchId: Joi.any().strip(),
  productCode: Joi.any().strip(),
  importPrice: Joi.any().strip(),
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
