// backend/models/Product.js
// Defines the shape of a Product document in MongoDB

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Books", "Electronics", "Hostel Essentials", "Accessories"],
    },
    suggestedPrice: {
      type: Number,
      required: [true, "Suggested price is required"],
      min: [1, "Price must be at least ₹1"],
    },
    originalPrice: {
      type: Number,
      required: [true, "Original price is required"],
      min: [1, "Price must be at least ₹1"],
    },
    image: {
      type: String,
      required: [true, "Image URL is required"],
    },
    // Reference to the User who listed this product
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Denormalised for easy display without always joining User
    sellerName: {
      type: String,
      required: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    // Department of seller e.g. "BCA 3rd Year"
    sellerDepartment: {
      type: String,
      default: "",
    },
    ratingLabel: {
      type: String,
      default: "New · 0 reviews",
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
