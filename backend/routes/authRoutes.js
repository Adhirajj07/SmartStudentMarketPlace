// backend/routes/authRoutes.js
// Handles user registration, login, and Google OAuth

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const ALLOWED_DOMAINS = ["amjaincollege.edu.in"];
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper: check if email belongs to the college
function isCollegeEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_DOMAINS.some((domain) => normalized.endsWith("@" + domain));
}

// Helper: generate a signed JWT token for a user
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Helper: build user response object
function userResponse(user) {
  return {
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
  };
}

// -------------------------------------------------------
// POST /api/auth/google
// Sign in or register with Google OAuth
// -------------------------------------------------------
router.post("/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required." });
  }

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email?.trim().toLowerCase();
    const name = payload.name || email.split("@")[0];

    // Block non-college emails
    if (!isCollegeEmail(email)) {
      return res.status(403).json({
        message: "Only @amjaincollege.edu.in email addresses are allowed.",
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Existing user — just log them in
      return res.json(userResponse(user));
    }

    // New user — auto-register with Google info
    // They won't have roll number etc., so set defaults
    user = await User.create({
      name,
      email,
      password: Math.random().toString(36) + Math.random().toString(36), // random password (they use Google to login)
      rollNumber: "N/A",
      universityRegisterNumber: "N/A",
      dob: "2000-01-01",
      department: "N/A",
      year: "N/A",
      isVerifiedStudent: true,
      googleAuth: true,
    });

    res.status(201).json(userResponse(user));

  } catch (error) {
    console.error("Google auth error:", error.message);
    res.status(401).json({ message: "Google verification failed. Please try again." });
  }
});

// -------------------------------------------------------
// POST /api/auth/register
// -------------------------------------------------------
router.post("/register", async (req, res) => {
  const { name, email, password, rollNumber, universityRegisterNumber, dob, department, year } = req.body;

  if (!name || !email || !password || !rollNumber || !universityRegisterNumber || !dob || !department || !year) {
    return res.status(400).json({ message: "Please fill all required registration details." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isCollegeEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Only verified college email IDs are allowed to register." });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: "An account with this email already exists." });
  }

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

    res.status(201).json(userResponse(user));
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// -------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide both email and password." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isCollegeEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Only verified college email IDs are allowed." });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json(userResponse(user));
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

module.exports = router;
