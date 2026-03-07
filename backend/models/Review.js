// backend/models/Review.js
// Stores buyer reviews for sellers

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // The seller being reviewed (User ID)
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    // The buyer leaving the review (User ID)
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    reviewerName: {
      type: String,
      required: true,
    },
    // Star rating 1-5
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Written comment — max 30 words enforced in backend
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent a buyer from reviewing the same seller more than once
reviewSchema.index({ seller: 1, reviewer: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
