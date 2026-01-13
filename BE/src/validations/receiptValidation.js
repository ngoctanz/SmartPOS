import Joi from "joi";
import ApiError from "../utils/apiError.js";

const productItemSchema = Joi.object({
  productId: Joi.string().required().hex().length(24),
  productName: Joi.string().allow(""),
  quantity: Joi.number().integer().min(1).required(),
  salePrice: Joi.number().min(0),
});

const createReceiptSchema = Joi.object({
  branchId: Joi.string().required().hex().length(24),
  listProduct: Joi.array().items(productItemSchema).min(1).required(),
  totalAmount: Joi.number().min(0),
  paymentMethod: Joi.string().valid("cash", "transfer").default("cash"),
  customerPaid: Joi.number().min(0),
});

const importProductItemSchema = Joi.object({
  productId: Joi.string().required().hex().length(24),
  quantity: Joi.number().integer().min(1).required(),
  importPrice: Joi.number().min(0).required(),
});

const createImportReceiptSchema = Joi.object({
  branchId: Joi.string().required().hex().length(24),
  supplierName: Joi.string().max(200).trim().allow(""),
  listProduct: Joi.array().items(importProductItemSchema).min(1).required(),
  note: Joi.string().max(500).trim().allow(""),
});

const createReceipt = async (req, res, next) => {
  try {
    await createReceiptSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(400, errorMessage));
  }
};

const createImportReceipt = async (req, res, next) => {
  try {
    await createImportReceiptSchema.validateAsync(req.body, {
      abortEarly: false,
    });
    next();
  } catch (error) {
    const errorMessage =
      error.details?.map((detail) => detail.message).join(", ") ||
      error.message;
    return next(new ApiError(400, errorMessage));
  }
};

export const receiptValidation = {
  createReceipt,
  createImportReceipt,
};
