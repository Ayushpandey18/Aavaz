import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

// 🔹 Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Upload single file
const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "myapp_uploads",
    });

    // delete local file after upload
    await fs.unlink(localFilePath).catch((err) =>
      console.error("Failed to delete local file:", localFilePath, err.message)
    );

    return response;
  } catch (error) {
    // cleanup even if upload fails
    await fs.unlink(localFilePath).catch(() => {});
    console.error("Cloudinary upload error:", error.message);
    return null;
  }
};

// ✅ Upload multiple files
const uploadMultipleOnCloudinary = async (files = []) => {
  if (!files.length) return [];

  const results = [];

  for (const file of files) {
    try {
      const res = await cloudinary.uploader.upload(file.path, {
        resource_type: "auto",
        folder: "myapp_uploads",
      });
      await fs.unlink(file.path).catch((err) =>
        console.error("Failed to delete local file:", file.path, err.message)
      );

      results.push(res);
    } catch (error) {
      // cleanup if upload fails
      if (file?.path) {
        await fs.unlink(file.path).catch(() => {});
      }
      console.error("Cloudinary multiple upload error:", error.message);
    }
  }

  return results;
};

// ✅ Delete single file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;

  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res;
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
    return null;
  }
};

// ✅ Delete multiple files from Cloudinary
const deleteMultipleFromCloudinary = async (publicIds = []) => {
  if (!publicIds.length) return [];

  try {
    const res = await cloudinary.api.delete_resources(publicIds);
    return res;
  } catch (error) {
    console.error("Cloudinary multiple delete error:", error.message);
    return [];
  }
};

export {
  uploadOnCloudinary,
  uploadMultipleOnCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
};
