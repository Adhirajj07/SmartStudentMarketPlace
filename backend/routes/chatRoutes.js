// backend/routes/chatRoutes.js
// REST API for fetching chat history

const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { decrypt } = require("../utils/encryption");
const { protect } = require("../middleware/authMiddleware");

// -------------------------------------------------------
// GET /api/chat/inbox/:sellerEmail
// Fetch all unique chat threads for a seller
// IMPORTANT: This must be defined BEFORE /:productId/:buyerEmail
// -------------------------------------------------------
router.get("/inbox/:sellerEmail", protect, async (req, res) => {
  try {
    const threads = await Message.aggregate([
      {
        $match: {
          sellerEmail: req.params.sellerEmail.toLowerCase(),
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            productId: "$productId",
            buyerEmail: "$buyerEmail",
          },
          lastMessage: { $first: "$text" },
          lastMessageTime: { $first: "$createdAt" },
          buyerEmail: { $first: "$buyerEmail" },
          productId: { $first: "$productId" },
          senderName: { $first: "$senderName" },
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    // Populate product names and decrypt lastMessage preview
    const Product = require("../models/Product");
    const threadsWithProducts = await Promise.all(
      threads.map(async (thread) => {
        const product = await Product.findById(thread.productId).select("name");

        // Decrypt the lastMessage preview
        let lastMessage = thread.lastMessage;
        try { lastMessage = decrypt(lastMessage); } catch (_) {}

        return {
          ...thread,
          lastMessage,
          productName: product ? product.name : "Deleted product",
        };
      })
    );

    res.json(threadsWithProducts);
  } catch (error) {
    console.error("Fetch inbox error:", error);
    res.status(500).json({ message: "Could not fetch inbox." });
  }
});

// -------------------------------------------------------
// GET /api/chat/buyer-inbox/:buyerEmail
// Fetch all unique chat threads where the user is the buyer
// -------------------------------------------------------
router.get("/buyer-inbox/:buyerEmail", protect, async (req, res) => {
  try {
    const threads = await Message.aggregate([
      { $match: { buyerEmail: req.params.buyerEmail.toLowerCase() } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { productId: "$productId", buyerEmail: "$buyerEmail" },
          lastMessage: { $first: "$text" },
          lastMessageTime: { $first: "$createdAt" },
          buyerEmail: { $first: "$buyerEmail" },
          sellerEmail: { $first: "$sellerEmail" },
          productId: { $first: "$productId" },
          senderName: { $first: "$senderName" },
        },
      },
      { $sort: { lastMessageTime: -1 } },
    ]);

    const Product = require("../models/Product");
    const threadsWithProducts = await Promise.all(
      threads.map(async (thread) => {
        const product = await Product.findById(thread.productId).select("name");
        let lastMessage = thread.lastMessage;
        try { lastMessage = decrypt(lastMessage); } catch (_) {}
        return {
          ...thread,
          lastMessage,
          productName: product ? product.name : "Deleted product",
        };
      })
    );

    res.json(threadsWithProducts);
  } catch (error) {
    console.error("Fetch buyer inbox error:", error);
    res.status(500).json({ message: "Could not fetch inbox." });
  }
});

// -------------------------------------------------------
// GET /api/chat/:productId/:buyerEmail
// Fetch all messages for a specific product + buyer thread
// -------------------------------------------------------
router.get("/:productId/:buyerEmail", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      productId: req.params.productId,
      buyerEmail: req.params.buyerEmail.toLowerCase(),
    }).sort({ createdAt: 1 }); // oldest first — decrypted via post hook

    res.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    res.status(500).json({ message: "Could not fetch messages." });
  }
});

module.exports = router;
