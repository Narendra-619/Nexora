import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],
    validate: [v => Array.isArray(v) && v.length >= 2, "Conversation requires at least two participants"]
  },
  lastMessage: {
    text: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
