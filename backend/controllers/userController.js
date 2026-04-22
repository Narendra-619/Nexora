import User from "../models/User.js";
import Post from "../models/Post.js";
import { cloudinary, extractPublicId } from "../middleware/upload.js";

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Post.find({ userId })
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({ user, posts });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);
    
    // Case-insensitive search for username
    const users = await User.find({ 
      username: { $regex: q, $options: "i" } 
    }).select("username profilePicture").limit(10);
    
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update basic fields
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;

    // Handle profile picture update
    if (req.file) {
      // If user already has a profile picture, delete it from Cloudinary
      if (user.profilePicture) {
        const publicId = extractPublicId(user.profilePicture);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      user.profilePicture = req.file.path; // New Cloudinary URL
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Server error" });
  }
};
