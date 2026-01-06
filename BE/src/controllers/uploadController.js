import { StatusCodes } from "http-status-codes";
import { cloudinaryService } from "../services/cloudinaryService.js";
import ApiError from "../utils/apiError.js";

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "No file uploaded!");
    }

    // Convert buffer to base64 string for cloudinary upload
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const result = await cloudinaryService.uploadImage(dataURI);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Upload image successfully",
      data: result, // { url, publicId }
    });
  } catch (error) {
    next(error);
  }
};

export const uploadController = {
  uploadImage,
};
