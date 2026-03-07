// backend/routes/reviewRoutes.js

const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// -------------------------------------------------------
// GET /api/reviews/can-review/:sellerEmail
// Check if the logged-in buyer can review this seller
// Returns { canReview: true/false, reason: "..." }
// -------------------------------------------------------
router.get("/can-review/:sellerEmail", protect, async (req, res) => {
  try {
    const sellerEmail = req.params.sellerEmail.toLowerCase();

    // Can't review yourself
    if (req.user.email === sellerEmail) {
      return res.json({ canReview: false, reason: "You cannot review yourself." });
    }

    // Check if already reviewed
    const existing = await Review.findOne({
      reviewer: req.user._id,
      sellerEmail,
    });
    if (existing) {
      return res.json({ canReview: false, reason: "You have already reviewed this seller." });
    }

    // Check if buyer has chatted with seller
    const chatExists = await Message.findOne({
      buyerEmail: req.user.email.toLowerCase(),
      sellerEmail,
    });
    if (!chatExists) {
      return res.json({ canReview: false, reason: "Chat with the seller first to leave a review." });
    }

    res.json({ canReview: true });
  } catch (error) {
    res.status(500).json({ message: "Could not check review eligibility." });
  }
});


// POST /api/reviews
// Submit a review for a seller
// Only allowed if buyer has chatted with the seller
// -------------------------------------------------------
router.post("/", protect, async (req, res) => {
  const { sellerEmail, rating, comment } = req.body;

  if (!sellerEmail || !rating || !comment) {
    return res.status(400).json({ message: "Please provide seller, rating, and comment." });
  }

  // Enforce 30 word limit on comment
  if (comment.trim().length > 30) {
  return res.status(400).json({ message: `Comment must be 30 characters or less.` });
}

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  // Prevent seller from reviewing themselves
  if (req.user.email === sellerEmail.toLowerCase()) {
    return res.status(400).json({ message: "You cannot review yourself." });
  }

  // Check if buyer has chatted with this seller (proof of interaction)
  const chatExists = await Message.findOne({
    buyerEmail: req.user.email.toLowerCase(),
    sellerEmail: sellerEmail.toLowerCase(),
  });

  if (!chatExists) {
    return res.status(403).json({
      message: "You can only review sellers you have chatted with.",
    });
  }

  // Find the seller user
  const sellerUser = await User.findOne({ email: sellerEmail.toLowerCase() });
  if (!sellerUser) {
    return res.status(404).json({ message: "Seller not found." });
  }

  try {
    const review = await Review.create({
      seller: sellerUser._id,
      sellerEmail: sellerEmail.toLowerCase(),
      reviewer: req.user._id,
      reviewerEmail: req.user.email,
      reviewerName: req.user.name || req.user.email.split("@")[0],
      rating: Number(rating),
      comment: comment.trim(),
    });

    res.status(201).json(review);
  } catch (error) {
    // Duplicate review
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this seller." });
    }
    console.error("Review error:", error);
    res.status(500).json({ message: "Server error while submitting review." });
  }
});

// -------------------------------------------------------
// GET /api/reviews/:sellerEmail
// Get all reviews for a seller + average rating
// -------------------------------------------------------
router.get("/:sellerEmail", async (req, res) => {
  try {
    const reviews = await Review.find({
      sellerEmail: req.params.sellerEmail.toLowerCase(),
    }).sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    res.json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ message: "Could not fetch reviews." });
  }
});

// -------------------------------------------------------
module.exports = router;
