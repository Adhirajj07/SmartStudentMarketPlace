// backend/server.js
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const aiCheckRoutes = require("./routes/aiCheckRoutes");
const communityRoutes = require("./routes/communityRoutes");
const Message = require("./models/Message");
const Product = require("./models/Product");

connectDB();
const app = express();
const httpServer = http.createServer(app);

// ---- Allowed origins ----
const ALLOWED_ORIGINS = [
  "https://smart-student-market-place.vercel.app",
  "https://ssm-backend-upny.onrender.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors(corsOptions));
app.use(express.json());

// ---- Rate limiting ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 mins per IP
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit on auth routes
  message: { message: "Too many login attempts. Please try again later." },
});

app.use(limiter);
app.use("/api/auth", authLimiter);

// ---- Security headers ----
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/ai-check", aiCheckRoutes);
app.use("/api/community", communityRoutes);

app.get("/", (req, res) => res.json({ message: "Smart Student Marketplace API is running ✅" }));

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on("join_room", ({ productId, buyerEmail }) => {
    const room = `${productId}::${buyerEmail}`;
    socket.join(room);
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
        _id: message._id, productId, buyerEmail,
        senderEmail: message.senderEmail,
        senderName: message.senderName,
        text: text,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error("Socket message error:", error);
    }
  });

  socket.on("leave_room", ({ productId, buyerEmail }) => {
    const room = `${productId}::${buyerEmail}`;
    socket.leave(room);
  });

  socket.on("community_join", () => socket.join("community"));
  socket.on("community_message", (msg) => io.to("community").emit("community_message", msg));
  socket.on("community_like", (data) => io.to("community").emit("community_like", data));
  socket.on("community_delete", (data) => io.to("community").emit("community_delete", data));
  socket.on("disconnect", () => console.log(`🔌 Socket disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
