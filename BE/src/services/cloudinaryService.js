import { v2 as cloudinary } from "cloudinary";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: process.env.CLOUDINARY_FOLDER,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

const updateImage = async (file, oldPublicId) => {
  try {
    const newImage = await uploadImage(file);
    if (oldPublicId && oldPublicId !== newImage.publicId) {
      await deleteImage(oldPublicId);
    }

    return newImage;
  } catch (error) {
    throw new Error(`Cloudinary update failed: ${error.message}`);
  }
};

const uploadMultipleImages = async (files) => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => uploadImage(file));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    throw new Error(`Cloudinary multiple upload failed: ${error.message}`);
  }
};

const deleteMultipleImages = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return [];
    }

    const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
    const results = await Promise.allSettled(deletePromises);
    return results;
  } catch (error) {
    throw new Error(`Cloudinary multiple delete failed: ${error.message}`);
  }
};

export const cloudinaryService = {
  uploadImage,
  deleteImage,
  updateImage,
  uploadMultipleImages,
  deleteMultipleImages,
};
