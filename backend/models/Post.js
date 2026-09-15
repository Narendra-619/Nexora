import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  text: {
    type: String,
    required: true
  }
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: {
    type: String,
    default: ""
  },
  image: {
    type: String,
    default: ""
  },
  video: {
    type: String,
    default: ""
  },
  allowDownload: {
    type: Boolean,
    default: true
  },
  mentions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  comments: [commentSchema],
  status: {
    type: String,
    enum: ["draft", "scheduled", "publishing", "published"],
    default: "published"
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  claimedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

postSchema.index({ status: 1, scheduledAt: 1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ userId: 1, status: 1, createdAt: -1 });
postSchema.index({ text: "text" });

export default mongoose.model("Post", postSchema);