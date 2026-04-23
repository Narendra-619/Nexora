import User from "../models/User.js";
import Notification from "../models/Notification.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create and save new user (hashing happens in User model pre-save hook)
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Create Welcome Notification
    const welcomeNotification = new Notification({
      recipient: user._id,
      type: "welcome",
      message: "Welcome to Nexora 🚀 Your space to connect, share moments, chat with friends, and express yourself. Start posting, reacting, and building your network today!"
    });
    await welcomeNotification.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



/**
 * Authenticate user and return token
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        error: "No user found with this email"
      });
    }

    // Use bcrypt to compare password with hashed version in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    // Sign JWT with user secret and set expiration
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};