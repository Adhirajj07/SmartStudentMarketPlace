// backend/routes/authRoutes.js
// Handles user registration and login

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ALLOWED_DOMAINS = ["amjaincollege.edu.in"];

// Helper: check if email belongs to the college
function isCollegeEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_DOMAINS.some((domain) => normalized.endsWith("@" + domain));
}

// Helper: generate a signed JWT token for a user
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Token expires after 7 days
  });
}

// -------------------------------------------------------
// POST /api/auth/register
// Register a new student account
// -------------------------------------------------------
router.post("/register", async (req, res) => {
  const { name, email, password, rollNumber, universityRegisterNumber, dob, department, year } =
    req.body;

  // --- Validation ---
  if (
    !name ||
    !email ||
    !password ||
    !rollNumber ||
    !universityRegisterNumber ||
    !dob ||
    !department ||
    !year
  ) {
    return res
      .status(400)
      .json({ message: "Please fill all required registration details." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isCollegeEmail(normalizedEmail)) {
    return res.status(400).json({
      message: "Only verified college email IDs are allowed to register.",
    });
  }

  // --- Check for duplicate email ---
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: "An account with this email already exists." });
  }

  // --- Create user (password is hashed in the model's pre-save hook) ---
  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      rollNumber: rollNumber.trim(),
      universityRegisterNumber: universityRegisterNumber.trim(),
      dob: dob.trim(),
      department: department.trim(),
      year: year.trim(),
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      universityRegisterNumber: user.universityRegisterNumber,
      dob: user.dob,
      department: user.department,
      year: user.year,
      isVerifiedStudent: user.isVerifiedStudent,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// -------------------------------------------------------
// POST /api/auth/login
// Log in with email and password
// -------------------------------------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide both email and password." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isCollegeEmail(normalizedEmail)) {
    return res.status(400).json({
      message: "Only verified college email IDs are allowed.",
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Compare the entered password with the hashed one
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      universityRegisterNumber: user.universityRegisterNumber,
      dob: user.dob,
      department: user.department,
      year: user.year,
      isVerifiedStudent: user.isVerifiedStudent,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

module.exports = router;
