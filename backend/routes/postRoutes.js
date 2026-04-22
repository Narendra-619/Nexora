import express from "express";
import { createPost, getPosts, toggleLike, addComment, deletePost, updatePost, searchPosts, getPostById } from "../controllers/postController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Post-related routes with integrated protection middleware
router.post("/", protect, upload.single("image"), createPost);   
router.get("/", getPosts);               
router.get("/search", protect, searchPosts);
router.get("/:id", protect, getPostById);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/comment", protect, addComment);
router.put("/:id", protect, upload.single("image"), updatePost);
router.delete("/:id", protect, deletePost);

export default router;