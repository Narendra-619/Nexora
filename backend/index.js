import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/postRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import draftRoutes from "./routes/draftRoutes.js";
import collectionRoutes from "./routes/collectionRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import passwordResetRoutes from "./routes/passwordResetRoutes.js";
import { startScheduler, catchUpOverduePosts } from "./services/scheduler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler.js";
import { injectSocket } from "./controllers/chatController.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS allowed origins: supports CLIENT_URL from env, production Vercel frontend, and local dev
const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map(url => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    "https://socialapp-kura.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    ...clientUrls
  ])
];

// Middleware configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Increase payload limit for image uploads and base64 data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
app.use("/api", generalLimiter);

// Basic health check route
app.get("/", (req, res) => {
  res.send("Backend Working");
});

// API Route mounting (order matters: specific routes before param routes)
app.use("/api/posts", postRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", followRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/drafts", draftRoutes);
app.use("/api/collections", collectionRoutes);

// Global Error Handler
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// H4: Inject io into chatController so HTTP sendMessage
// can emit real-time events after persisting to DB.
injectSocket(io);

io.on("connection", (socket) => {
  const userId = socket.userId?.toString();
  if (userId) {
    socket.join(userId);
  }
});

// C1, C2: Only start server after MongoDB connects
mongoose.connect(process.env.DATABASE || "mongodb://127.0.0.1:27017/social_app", {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 45000,
})
  .then(async () => {
    console.log("MongoDB connected");
    startScheduler();
    await catchUpOverduePosts();

    server.listen(PORT, () => {
      console.log(`Server running on port http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    setTimeout(() => {
      process.exit(1);
    }, 3000);
  });

// C2: Unhandled rejection and exception handlers
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    mongoose.disconnect().then(() => process.exit(0));
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    mongoose.disconnect().then(() => process.exit(0));
  });
});