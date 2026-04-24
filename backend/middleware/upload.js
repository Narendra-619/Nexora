import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "social_app",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    // Removed complex transformation for now to ensure stability
    transformation: [{ width: 1200, crop: "limit" }]
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB
  } 
});

const extractPublicId = (url) => {
  try {
    const splitUrl = url.split("/");
    const lastSegment = splitUrl[splitUrl.length - 1];
    const publicId = lastSegment.split(".")[0];
    return `social_app/${publicId}`;
  } catch (error) {
    return null;
  }
};

export { cloudinary, upload, extractPublicId };
