import crypto from "crypto";
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const DEFAULT_REFRESH_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const generateAccessToken = (user) => {
  const userId = (user._id || user.id || user).toString();
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";

  return jwt.sign(
    {
      sub: userId,
      id: userId,
      type: "access"
    },
    secret,
    { expiresIn }
  );
};

export const getCookieOptions = (req) => {
  const isHttps =
    req?.secure ||
    req?.headers?.["x-forwarded-proto"] === "https" ||
    process.env.COOKIE_SECURE === "true";

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: DEFAULT_REFRESH_LIFETIME_MS
  };
};

export const setRefreshCookie = (res, rawRefreshToken, req) => {
  const options = getCookieOptions(req);
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, options);
};

export const clearRefreshCookie = (res, req) => {
  const options = getCookieOptions(req);
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path
  });
};

export const createSession = async ({ userId, req }) => {
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + DEFAULT_REFRESH_LIFETIME_MS);

  const userAgent = req?.headers?.["user-agent"] || "";
  const ip = req?.ip || req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "";

  await Session.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent,
    ip
  });

  const accessToken = generateAccessToken({ _id: userId });

  return {
    accessToken,
    rawRefreshToken,
    expiresAt
  };
};
