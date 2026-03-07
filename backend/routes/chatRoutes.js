// backend/routes/chatRoutes.js
// REST API for fetching chat history

const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

// -------------------------------------------------------
// GET /api/chat/inbox/:sellerEmail
// Fetch all unique chat threads for a seller
// IMPORTANT: This must be defined BEFORE /:productId/:buyerEmail
// Otherwise Express matches "inbox" as a productId
// -------------------------------------------------------
router.get("/inbox/:sellerEmail", protect, async (req, res) => {
  try {
    // Find all unique productId + buyerEmail combinations for this seller
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

    // Populate product names
    const Product = require("../models/Product");
    const threadsWithProducts = await Promise.all(
      threads.map(async (thread) => {
        const product = await Product.findById(thread.productId).select("name");
        return {
          ...thread,
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
// GET /api/chat/:productId/:buyerEmail
// Fetch all messages for a specific product + buyer thread
// Requires login
// -------------------------------------------------------
router.get("/:productId/:buyerEmail", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      productId: req.params.productId,
      buyerEmail: req.params.buyerEmail.toLowerCase(),
    }).sort({ createdAt: 1 }); // oldest first

    res.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    res.status(500).json({ message: "Could not fetch messages." });
  }
});

module.exports = router;
