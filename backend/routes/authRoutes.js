import express from "express";
import { register, login, refreshToken, logout, logoutAll, getMe } from "../controllers/auth.js";
import { verifyEmail, resendVerification } from "../controllers/passwordResetController.js";
import { authLimiter, registerLimiter, otpLimiter, refreshLimiter } from "../middleware/rateLimiter.js";
import { validateRegistration, validateLogin } from "../middleware/validate.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerLimiter, validateRegistration, register);
router.post("/login", authLimiter, validateLogin, login);
router.post("/refresh", refreshLimiter, refreshToken);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAll);
router.get("/me", protect, getMe);
router.post("/verify-email", otpLimiter, verifyEmail);
router.post("/resend-verification", otpLimiter, resendVerification);

export default router;

