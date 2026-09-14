import User from "../models/User.js";
import Notification from "../models/Notification.js";
import PasswordReset from "../models/PasswordReset.js";
import Session from "../models/Session.js";
import { sendVerificationEmail } from "../services/emailService.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  createSession,
  setRefreshCookie,
  clearRefreshCookie,
  generateAccessToken,
  generateRefreshToken,
  hashToken
} from "../services/tokenService.js";

const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const safeUsername = username.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const usernameExists = await User.findOne({ username: new RegExp(`^${safeUsername}$`, "i") });
    if (usernameExists) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    const user = new User({
      username,
      email: email.toLowerCase(),
      password
    });

    await user.save();

    try {
      await Notification.create({
        recipient: user._id,
        type: "welcome",
        message: "Welcome to Nexora 🚀 Your space to connect, share moments, chat with friends, and express yourself. Start posting, reacting, and building your network today!"
      });

      await PasswordReset.updateMany(
        { userId: user._id, used: false, purpose: "email-verification" },
        { used: true }
      );

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await PasswordReset.create({
        userId: user._id,
        otp: hashOTP(otp),
        expiresAt,
        purpose: "email-verification"
      });

      await sendVerificationEmail(user.email, otp);

      res.status(201).json({
        message: "Verification code sent to your email",
        userId: user._id
      });
    } catch (emailError) {
      console.error("Registration email/notification error:", emailError);
      await User.findByIdAndDelete(user._id);
      res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
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
        error: "Email/username and password are required"
      });
    }

    const safeIdentifier = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { username: { $regex: new RegExp(`^${safeIdentifier}$`, "i") } }
      ]
    });
    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    // Create server-side session and set secure HttpOnly refresh token cookie
    const session = await createSession({ userId: user._id, req });
    setRefreshCookie(res, session.rawRefreshToken, req);

    res.status(200).json({
      message: "Login successful",
      accessToken: session.accessToken,
      token: session.accessToken, // Backward compatibility alias
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Server error during login"
    });
  }
};

/**
 * Refresh access token and rotate refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const currentHash = hashToken(rawRefreshToken);

    // Look for session matching current token hash
    let session = await Session.findOne({ tokenHash: currentHash });

    if (!session) {
      // Check for possible token reuse (someone presenting an already replaced token)
      const replacedSession = await Session.findOne({ replacedByTokenHash: currentHash });
      if (replacedSession) {
        console.warn(`[Security] Refresh token reuse detected for user ${replacedSession.userId}! Revoking all sessions.`);
        await Session.updateMany(
          { userId: replacedSession.userId, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        );
        clearRefreshCookie(res, req);
        return res.status(403).json({
          error: "Suspicious activity detected. All sessions revoked. Please log in again."
        });
      }
      clearRefreshCookie(res, req);
      return res.status(401).json({ error: "Invalid refresh session" });
    }

    // If session was already revoked, check if within grace period (15s)
    if (session.revokedAt) {
      const timeSinceRevocation = Date.now() - new Date(session.revokedAt).getTime();
      if (timeSinceRevocation < 15000 && session.replacedByTokenHash) {
        // Concurrent tab grace period: issue access token without secondary rotation
        const user = await User.findById(session.userId).select("-password");
        if (user) {
          const accessToken = generateAccessToken(user);
          return res.status(200).json({
            accessToken,
            token: accessToken,
            user: {
              id: user._id,
              _id: user._id,
              username: user.username,
              email: user.email,
              profilePicture: user.profilePicture
            }
          });
        }
      }

      // Outside grace window: revoke all sessions
      console.warn(`[Security] Revoked refresh token presented outside grace period for user ${session.userId}.`);
      await Session.updateMany(
        { userId: session.userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      clearRefreshCookie(res, req);
      return res.status(403).json({ error: "Session expired or revoked. Please log in again." });
    }

    // Check expiration
    if (new Date(session.expiresAt) <= new Date()) {
      session.revokedAt = new Date();
      await session.save();
      clearRefreshCookie(res, req);
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const user = await User.findById(session.userId).select("-password");
    if (!user) {
      clearRefreshCookie(res, req);
      return res.status(401).json({ error: "User account no longer exists" });
    }

    // Rotate refresh token: generate new token, record replacement, revoke old session
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || ""
    });

    session.revokedAt = new Date();
    session.replacedByTokenHash = newTokenHash;
    await session.save();

    setRefreshCookie(res, newRawRefreshToken, req);
    const accessToken = generateAccessToken(user);

    res.status(200).json({
      accessToken,
      token: accessToken,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ error: "Failed to refresh session" });
  }
};

/**
 * Log out current session
 */
export const logout = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await Session.updateOne(
        { tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    clearRefreshCookie(res, req);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    clearRefreshCookie(res, req);
    res.status(200).json({ message: "Logged out" });
  }
};

/**
 * Log out all sessions for current user (revoke all devices)
 */
export const logoutAll = async (req, res) => {
  try {
    if (req.user?._id) {
      await Session.updateMany(
        { userId: req.user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    clearRefreshCookie(res, req);
    res.status(200).json({ message: "All sessions logged out successfully" });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ error: "Failed to logout all sessions" });
  }
};

/**
 * Return current user from valid access token
 */
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.status(200).json({
      user: {
        id: req.user._id,
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        bio: req.user.bio,
        followers: req.user.followers,
        following: req.user.following,
        isPrivate: req.user.isPrivate
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
