import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import { sendOTPEmail, sendVerificationEmail } from "../services/emailService.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

export const requestReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: "If an account exists with this email, you will receive a reset code." });
    }

    await PasswordReset.updateMany({ userId: user._id, used: false, purpose: "password-reset" }, { used: true });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.create({
      userId: user._id,
      otp: hashOTP(otp),
      expiresAt,
      purpose: "password-reset"
    });

    try {
      await sendOTPEmail(user.email, otp);
    } catch (mailErr) {
      console.error("Failed to send OTP email:", mailErr.message);
      return res.status(500).json({
        error: `Failed to send reset code: ${mailErr.message || "Email delivery failed"}`
      });
    }

    res.status(200).json({ message: "If an account exists with this email, you will receive a reset code." });
  } catch (error) {
    console.error("REQUEST RESET ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "Invalid code" });
    }

    const hashedOtp = hashOTP(otp);

    const resetRecord = await PasswordReset.findOneAndUpdate(
      {
        userId: user._id,
        used: false,
        purpose: "password-reset",
        otp: hashedOtp,
        expiresAt: { $gt: new Date() }
      },
      { $set: { used: true } },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!resetRecord) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const resetToken = jwt.sign(
      { userId: user._id, purpose: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    res.status(200).json({ message: "Code verified", resetToken });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: "Reset token and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({ error: "Invalid token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "Invalid code" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const hashedOtp = hashOTP(otp);

    const verifyRecord = await PasswordReset.findOneAndUpdate(
      {
        userId: user._id,
        used: false,
        purpose: "email-verification",
        otp: hashedOtp,
        expiresAt: { $gt: new Date() }
      },
      { $set: { used: true } },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!verifyRecord) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    user.isVerified = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: "If an account exists with this email, you will receive a verification code." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

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

    res.status(200).json({ message: "If an account exists with this email, you will receive a verification code." });
  } catch (error) {
    console.error("RESEND VERIFICATION ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};
