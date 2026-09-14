import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Authentication Middleware
 * Verifies Bearer token and attaches user object to request
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if authorization header exists and starts with Bearer
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Split "Bearer TOKEN" into ["Bearer", "TOKEN"] and take index 1
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        error: "Not authorized, no token"
      });
    }

    // Verify token using secret key
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    if (decoded.type && decoded.type !== "access") {
      return res.status(401).json({ error: "Invalid token type. Access token required." });
    }

    const userId = decoded.sub || decoded.id;

    // Fetch user from DB excluding password field and attach to request object
    req.user = await User.findById(userId).select("-password");
    req.userId = userId;

    if (!req.user) {
      return res.status(401).json({ error: "User account no longer exists" });
    }

    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Session invalid. Please log in again." });
    }
    res.status(401).json({
      error: "Not authorized, token failed"
    });
  }
};