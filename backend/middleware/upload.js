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
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const extractPublicId = (url) => {
  try {
    const splitUrl = url.split("/");
    const lastSegment = splitUrl[splitUrl.length - 1];
    const publicIdWithExtension = lastSegment;
    const publicId = publicIdWithExtension.split(".")[0];
    return `social_app/${publicId}`;
  } catch (error) {
    return null;
  }
};

export { cloudinary, upload, extractPublicId };
