import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";

// io and onlineUsers are injected by index.js so the HTTP handler
// can emit to the recipient socket after persisting the message (H4).
let _io = null;
let _onlineUsers = null;

export const injectSocket = (io, onlineUsers) => {
  _io = io;
  _onlineUsers = onlineUsers;
};

export const getConversations = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // M7: pagination cap
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate("participants", "username profilePicture")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

    const convoIds = conversations.map((c) => c._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convoIds },
          sender: { $ne: new mongoose.Types.ObjectId(req.user._id) },
          read: false
        }
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 }
        }
      }
    ]);

    const unreadMap = {};
    for (const item of unreadAgg) {
      unreadMap[item._id.toString()] = item.count;
    }

    const conversationsWithUnread = conversations.map((c) => ({
      ...c,
      unreadCount: unreadMap[c._id.toString()] || 0
    }));

    res.status(200).json(conversationsWithUnread);
  } catch (error) {
    console.error("GET CONVERSATIONS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const userConvos = await Conversation.find({
      participants: userObjectId
    }).select("_id");

    const convoIds = userConvos.map((c) => c._id);

    if (convoIds.length === 0) {
      return res.status(200).json({ totalUnread: 0, unreadPerConversation: {} });
    }

    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convoIds },
          sender: { $ne: userObjectId },
          read: false
        }
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 }
        }
      }
    ]);

    let totalUnread = 0;
    const unreadPerConversation = {};
    for (const item of unreadAgg) {
      totalUnread += item.count;
      unreadPerConversation[item._id.toString()] = item.count;
    }

    res.status(200).json({
      totalUnread,
      unreadPerConversation
    });
  } catch (error) {
    console.error("GET UNREAD COUNT ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to view this conversation" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const messages = await Message.find({
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 }).limit(limit);
    res.status(200).json(messages);
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const sendMessage = async (req, res) => {
  const { conversationId, text, recipientId } = req.body;
  try {
    // M6: Validate text is a non-empty string
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const sanitizedText = text.trim().slice(0, 2000);

    let convoId = conversationId;
    let resolvedRecipientId = recipientId;
    
    if (!convoId) {
      if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ error: "Invalid recipient ID" });
      }
      if (recipientId.toString() === req.user._id.toString()) {
        return res.status(400).json({ error: "Cannot message yourself" });
      }

      const userObjectId = new mongoose.Types.ObjectId(req.user._id);
      const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

      // Find existing 2-party conversation or create a new one
      let convo = await Conversation.findOne({
        participants: { $all: [userObjectId, recipientObjectId], $size: 2 }
      });

      if (!convo) {
        convo = await Conversation.create({
          participants: [userObjectId, recipientObjectId]
        });
      }
      convoId = convo._id;
    } else {
      if (!mongoose.Types.ObjectId.isValid(convoId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      // Verify user is a participant in existing conversation
      const existing = await Conversation.findById(convoId).select("participants");
      if (!existing) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const isParticipant = existing.participants.some(
        (id) => id.toString() === req.user._id.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({ error: "Not authorized to send messages in this conversation" });
      }
      // Determine recipient from conversation participants
      if (!resolvedRecipientId) {
        const otherId = existing.participants.find(
          (id) => id.toString() !== req.user._id.toString()
        );
        resolvedRecipientId = otherId?.toString();
      }
    }

    const message = await Message.create({
      conversationId: convoId,
      sender: req.user._id,
      text: sanitizedText
    });

    await Conversation.findByIdAndUpdate(convoId, {
      lastMessage: { text: sanitizedText, sender: req.user._id, createdAt: new Date(), read: false },
      updatedAt: new Date()
    });

    // H4 + M15: Emit real-time message to recipient AFTER successful DB save
    if (_io && resolvedRecipientId) {
      const recipientIdStr = resolvedRecipientId.toString();
      const payload = {
        senderId: req.user._id.toString(),
        text: sanitizedText,
        createdAt: message.createdAt,
        _id: message._id,
        conversationId: convoId,
        read: false,
      };

      // Emit once to user's room (delivers to all active sockets of the user)
      _io.to(recipientIdStr).emit("getMessage", payload);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized for this conversation" });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const updateResult = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userObjectId },
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    if (conversation.lastMessage?.sender && conversation.lastMessage.sender.toString() !== req.user._id.toString()) {
      await Conversation.findByIdAndUpdate(conversationId, {
        "lastMessage.read": true
      });
    }

    if (_io) {
      const otherParticipants = conversation.participants
        .map((p) => p.toString())
        .filter((id) => id !== req.user._id.toString());

      for (const otherId of otherParticipants) {
        _io.to(otherId).emit("messagesRead", {
          conversationId,
          readerId: req.user._id.toString(),
          readAt: new Date()
        });
      }
    }

    res.status(200).json({
      success: true,
      markedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error("MARK CONVERSATION AS READ ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};
