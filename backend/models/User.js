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
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
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
    // NEW: Department e.g. "BCA"
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    // NEW: Year e.g. "3rd Year"
    year: {
      type: String,
      required: [true, "Year is required"],
      trim: true,
    },
    isVerifiedEmail: {
      type: Boolean,
      default: true, // We trust college email domain as verification
    },
    isVerifiedStudent: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// ----- MIDDLEWARE: Hash password before saving -----
// This runs automatically before every .save() call
userSchema.pre("save", async function (next) {
  // Only hash if password was changed (or it's a new user)
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ----- METHOD: Compare entered password with hashed one -----
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
