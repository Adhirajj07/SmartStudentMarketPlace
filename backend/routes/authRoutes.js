// backend/routes/authRoutes.js
// Handles Google OAuth and profile completion only

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
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email?.trim().toLowerCase();
    const name = payload.name || email.split("@")[0];

    // Block non-college Google accounts
    if (!isCollegeEmail(email)) {
      return res.status(403).json({
        message: "Only @amjaincollege.edu.in Google accounts are allowed.",
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Existing user — log them in directly
      return res.json(userResponse(user));
    }

    // New user — return pending so frontend shows the profile form
    return res.status(200).json({ pending: true, name, email });

  } catch (error) {
    console.error("Google auth error:", error.message);
    res.status(401).json({ message: "Google verification failed. Please try again." });
  }
});

// -------------------------------------------------------
// POST /api/auth/complete-profile
// Creates user account after Google sign-in with all required fields
// -------------------------------------------------------
router.post("/complete-profile", async (req, res) => {
  const { name, email, rollNumber, universityRegisterNumber, dob, department, year } = req.body;

  if (!name || !email || !rollNumber || !universityRegisterNumber || !dob || !department || !year) {
    return res.status(400).json({ message: "Please fill in all required fields." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isCollegeEmail(normalizedEmail)) {
    return res.status(403).json({ message: "Only @amjaincollege.edu.in Google accounts are allowed." });
  }

  try {
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Edge case: user re-submitted form — update their fields
      user.rollNumber = rollNumber.trim();
      user.universityRegisterNumber = universityRegisterNumber.trim();
      user.dob = dob.trim();
      user.department = department.trim();
      user.year = year.trim();
      await user.save();
    } else {
      // Create new user — no password needed, Google-authenticated
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        rollNumber: rollNumber.trim(),
        universityRegisterNumber: universityRegisterNumber.trim(),
        dob: dob.trim(),
        department: department.trim(),
        year: year.trim(),
        isVerifiedStudent: true,
        googleAuth: true,
      });
    }

    res.status(201).json(userResponse(user));
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({ message: "Server error while saving profile." });
  }
});

module.exports = router;
