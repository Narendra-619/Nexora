import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { cloudinary, extractPublicId } from "../middleware/upload.js";

/**
 * Create a new social post
 */
export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    const image = req.file ? req.file.path : req.body.image || "";
    
    // Validate that post has content
    if (!text && !image) {
      return res.status(400).json({
        error: "Post must have text or image"
      });
    }

    // Initialize new post with user ID from protection middleware
    const post = new Post({
      userId: req.user._id, 
      text,
      image
    });

    await post.save();

    res.status(201).json({
      message: "Post created",
      post
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Fetch all posts sorted by newest first with pagination
 */
export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json(posts);

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Search posts by text
 */
export const searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    const posts = await Post.find({
      text: { $regex: q, $options: "i" }
    })
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture");
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.status(200).json(post);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};



/**
 * Handle Like/Unlike logic for a post
 */
export const toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    // Check if user has already liked the post
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Remove user ID from likes array to unlike
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Add user ID to likes array to like
      post.likes.push(userId);
    }

    await post.save();

    // Notification logic
    if (!isLiked && post.userId.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.userId,
        sender: req.user._id,
        type: "like",
        post: post._id
      });
    }

    res.status(200).json({
      message: isLiked ? "Post unliked" : "Post liked",
      likesCount: post.likes.length
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Add a comment to a specific post
 */
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Comment cannot be empty"
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    // Create comment object
    const newComment = {
      userId: req.user._id,
      text
    };

    // Push new comment to the comments array
    post.comments.push(newComment);

    await post.save();

    // Notification logic
    if (post.userId.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.userId,
        sender: req.user._id,
        type: "comment",
        post: post._id
      });
    }

    const populatedPost = await Post.findById(postId).populate("comments.userId", "username profilePicture");
    res.status(201).json({ message: "Comment added", comments: populatedPost.comments });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Update a post (Only owner authorized)
 */
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Ownership check
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to edit this post" });
    }

    const { text } = req.body;
    if (text !== undefined) post.text = text;

    if (req.file) {
      if (post.image) {
        const publicId = extractPublicId(post.image);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      post.image = req.file.path;
    }

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture");

    res.status(200).json({
      message: "Post updated",
      post: populatedPost
    });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Delete a post (Only owner authorized)
 */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    // Ownership check
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Not authorized to delete this post"
      });
    }

    if (post.image) {
      const publicId = extractPublicId(post.image);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    await post.deleteOne();

    res.status(200).json({
      message: "Post deleted"
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};