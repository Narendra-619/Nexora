import express from "express";
import { getConversations, getMessages, sendMessage, getUnreadCount, markConversationAsRead } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/unread-count", protect, getUnreadCount);
router.get("/conversations", protect, getConversations);
router.put("/conversations/:conversationId/read", protect, markConversationAsRead);
router.get("/messages/:conversationId", protect, getMessages);
router.post("/messages", protect, sendMessage);

export default router;
