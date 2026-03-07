// backend/middleware/authMiddleware.js
// Protects routes — checks that the user is logged in via JWT

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // JWT is sent in the Authorization header as: "Bearer <token>"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract the token from the header
      token = req.headers.authorization.split(" ")[1];

      // Verify the token using our secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the logged-in user's info to the request object
      // (minus the password)
      req.user = await User.findById(decoded.id).select("-password");

      next(); // Proceed to the route handler
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({ message: "Not authorized, invalid token." });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token provided." });
  }
};

module.exports = { protect };
