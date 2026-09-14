import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      const userId = decoded.sub || decoded.id;
      req.user = await User.findById(userId).select("-password");
      req.userId = userId;
    }
  } catch {
    // Token invalid — continue without user
  }
  next();
};
