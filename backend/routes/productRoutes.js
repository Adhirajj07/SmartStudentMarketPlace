// backend/routes/productRoutes.js
// Handles all product-related API endpoints

const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// -------------------------------------------------------
// GET /api/products
// Fetch all products (public — no login needed)
// Optional query: ?category=Books
// -------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const filter = {};

    // If a category is passed as a query param, filter by it
    if (req.query.category && req.query.category !== "all") {
      filter.category = req.query.category;
    }

    // Sort newest first
    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({ message: "Server error while fetching products." });
  }
});

// -------------------------------------------------------
// GET /api/products/:id
// Fetch a single product by its ID
// -------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
  } catch (error) {
    console.error("Fetch single product error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// -------------------------------------------------------
// POST /api/products
// Add a new product listing (requires login)
// -------------------------------------------------------
router.post("/", protect, async (req, res) => {
  const { name, category, suggestedPrice, originalPrice, image } = req.body;

  // --- Validation ---
  if (!name || !category || !image) {
    return res
      .status(400)
      .json({ message: "Please provide name, category, and image URL." });
  }

  if (!suggestedPrice || suggestedPrice <= 0) {
    return res
      .status(400)
      .json({ message: "Suggested price must be a positive number." });
  }

  if (!originalPrice || originalPrice <= 0) {
    return res
      .status(400)
      .json({ message: "Original price must be a positive number." });
  }

  if (Number(suggestedPrice) > Number(originalPrice)) {
    return res.status(400).json({
      message:
        "Suggested selling price should not be higher than the original price.",
    });
  }

  try {
    const product = await Product.create({
      name: name.trim(),
      category,
      suggestedPrice: Math.round(Number(suggestedPrice)),
      originalPrice: Math.round(Number(originalPrice)),
      image: image.trim(),
      seller: req.user._id,        // The logged-in user's MongoDB ID
      // Show "Adhiraj J (BCA 3rd Year)" instead of roll number
      sellerName: req.user.name
        ? `${req.user.name} (${req.user.department && req.user.year ? req.user.department + " " + req.user.year : req.user.email.split("@")[0]})`
        : req.user.email,
      sellerEmail: req.user.email,
      sellerDepartment: req.user.department && req.user.year ? `${req.user.department} ${req.user.year}` : "",
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Server error while adding product." });
  }
});

// -------------------------------------------------------
// PUT /api/products/:id
// Update a product (only the seller can update their own)
// -------------------------------------------------------
router.put("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Only the seller who created this product can update it
    if (product.seller.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorised to update this product." });
    }

    const { name, category, suggestedPrice, originalPrice, image } = req.body;

    // Apply updates (only the fields that are provided)
    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (suggestedPrice) product.suggestedPrice = Math.round(Number(suggestedPrice));
    if (originalPrice) product.originalPrice = Math.round(Number(originalPrice));
    if (image) product.image = image.trim();

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Server error while updating product." });
  }
});

// -------------------------------------------------------
// DELETE /api/products/:id
// Delete a product (only the seller can delete their own)
// -------------------------------------------------------
router.delete("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Only the seller who created this product can delete it
    if (product.seller.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorised to delete this product." });
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully.", id: req.params.id });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Server error while deleting product." });
  }
});

module.exports = router;
