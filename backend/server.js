// backend/server.js
// Main server — Express + Socket.io for real-time chat

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");  // ← ADDED
const Message = require("./models/Message");
const Product = require("./models/Product");

// Connect to MongoDB
connectDB();

const app = express();

// Create HTTP server and attach Socket.io to it
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// -------------------------------------------------------
// Middleware
// -------------------------------------------------------
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json());

// -------------------------------------------------------
// REST API Routes
// -------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);  // ← ADDED

app.get("/", (req, res) => {
  res.json({ message: "Smart Student Marketplace API is running ✅" });
});

// -------------------------------------------------------
// Socket.io — Real-Time Chat
// -------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on("join_room", ({ productId, buyerEmail }) => {
    const room = `${productId}::${buyerEmail}`;
    socket.join(room);
    console.log(`📥 ${socket.id} joined room: ${room}`);
  });

  socket.on("send_message", async (data) => {
    const { productId, buyerEmail, senderEmail, senderName, text } = data;

    if (!productId || !buyerEmail || !senderEmail || !text) return;

    try {
      const product = await Product.findById(productId).select("sellerEmail");
      if (!product) return;

      const message = await Message.create({
        productId,
        buyerEmail: buyerEmail.toLowerCase(),
        sellerEmail: product.sellerEmail.toLowerCase(),
        senderEmail: senderEmail.toLowerCase(),
        senderName,
        text,
      });

      const room = `${productId}::${buyerEmail}`;
      io.to(room).emit("receive_message", {
        _id: message._id,
        productId,
        buyerEmail,
        senderEmail: message.senderEmail,
        senderName: message.senderName,
        text: message.text,
        createdAt: message.createdAt,
      });

      console.log(`💬 Message in room ${room}: ${text}`);
    } catch (error) {
      console.error("Socket message error:", error);
      socket.emit("error", { message: "Could not send message." });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// -------------------------------------------------------
// Start the server
// -------------------------------------------------------
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
