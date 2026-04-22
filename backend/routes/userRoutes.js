import express from "express";
import { getUserProfile, updateUserProfile, searchUsers } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/:userId", protect, getUserProfile);
router.put("/profile", protect, upload.single("profilePicture"), updateUserProfile);

export default router;
