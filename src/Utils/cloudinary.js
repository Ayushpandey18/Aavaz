import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload one file
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "myapp_uploads",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

// Upload multiple files
const uploadMultipleOnCloudinary = async (files = []) => {
  try {
    if (!files.length) return [];

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const res = await cloudinary.uploader.upload(file.path, {
          resource_type: "auto",
          folder: "myapp_uploads",
        });
        fs.unlinkSync(file.path);
        return res;
      })
    );

    return uploadResults;
  } catch (error) {
    files.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
    console.error("Cloudinary multiple upload error:", error);
    return [];
  }
};
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    const res = await cloudinary.uploader.destroy(publicId);
    return res;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};
const deleteMultipleFromCloudinary = async (publicIds = []) => {
  try {
    if (!publicIds.length) return [];

    const res = await cloudinary.api.delete_resources(publicIds);
    return res;
  } catch (error) {
    console.error("Cloudinary multiple delete error:", error);
    return [];
  }
};
export { uploadOnCloudinary, uploadMultipleOnCloudinary,deleteFromCloudinary,deleteMultipleFromCloudinary };
