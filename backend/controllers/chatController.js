import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate("participants", "username profilePicture")
    .sort({ updatedAt: -1 });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const sendMessage = async (req, res) => {
  const { conversationId, text, recipientId } = req.body;
  try {
    let convoId = conversationId;
    
    // If no conversationId, check if one exists or create it
    if (!convoId) {
      let convo = await Conversation.findOne({
        participants: { $all: [req.user._id, recipientId] }
      });
      
      if (!convo) {
        convo = await Conversation.create({
          participants: [req.user._id, recipientId]
        });
      }
      convoId = convo._id;
    }

    const message = await Message.create({
      conversationId: convoId,
      sender: req.user._id,
      text
    });

    await Conversation.findByIdAndUpdate(convoId, {
      lastMessage: { text, sender: req.user._id, createdAt: new Date() },
      updatedAt: new Date()
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
