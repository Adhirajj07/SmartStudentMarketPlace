// backend/models/User.js
// Defines the shape of a User document in MongoDB

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional — Google users don't have a password
    password: {
      type: String,
      required: false,
      default: null,
    },
    googleAuth: {
      type: Boolean,
      default: false,
    },
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      trim: true,
    },
    universityRegisterNumber: {
      type: String,
      required: [true, "University register number is required"],
      trim: true,
    },
    dob: {
      type: String,
      required: [true, "Date of birth is required"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    year: {
      type: String,
      required: [true, "Year is required"],
      trim: true,
    },
    isVerifiedEmail: {
      type: Boolean,
      default: true,
    },
    isVerifiedStudent: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----- MIDDLEWARE: Hash password before saving (only if password exists) -----
userSchema.pre("save", async function (next) {
  // Skip if no password (Google users) or password not modified
  if (!this.password || !this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ----- METHOD: Compare entered password with hashed one -----
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
