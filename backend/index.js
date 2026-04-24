import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/postRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import http from "http";
import { Server } from "socket.io";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Increase payload limit for Base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
mongoose.connect(process.env.DATABASE || "mongodb://127.0.0.1:27017/social_app")
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.log("MongoDB connection error:", err));

// Basic health check route
app.get("/", (req, res) => {
  res.send("Backend Working");
});

// API Route mounting
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chats", chatRoutes);

// Global Error Handler (Specifically handles Multer errors)
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  if (err.name === 'MulterError' || err.message.includes('file type')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("addUser", (userId) => {
    const existingUserIndex = onlineUsers.findIndex((u) => u.userId === userId);
    if (existingUserIndex !== -1) {
      onlineUsers[existingUserIndex].socketId = socket.id;
    } else {
      onlineUsers.push({ userId, socketId: socket.id });
    }
    io.emit("getUsers", onlineUsers);
  });

  socket.on("sendMessage", ({ senderId, receiverId, text }) => {
    const user = onlineUsers.find((u) => u.userId === receiverId);
    if (user) {
      io.to(user.socketId).emit("getMessage", {
        senderId,
        text,
      });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
    io.emit("getUsers", onlineUsers);
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});