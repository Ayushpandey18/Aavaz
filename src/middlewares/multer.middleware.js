import multer from "multer";
import path from "path";

// Storage in ./public/temp
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });

// // Single file upload → req.file
// export const uploadSingle = upload.single("file");

// // Multiple files upload → req.files
// export const uploadMultiple = upload.array("files", 10); 
// // here 10 = max number of files
// ✅ Flexible version
export const uploadSingle = (fieldName = "file") => upload.single(fieldName);

// ✅ Multiple file version
export const uploadMultiple = (fieldName = "files", maxCount = 10) =>
  upload.array(fieldName, maxCount);
