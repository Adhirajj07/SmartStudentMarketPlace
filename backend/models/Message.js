// backend/models/Message.js
// Stores each chat message in MongoDB with AES-256-GCM encryption

const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/encryption");

const messageSchema = new mongoose.Schema(
  {
    // Which product this chat is about
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // The buyer's email (identifies the chat thread)
    buyerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    // The seller's email
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    // Who sent this message (email)
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    // Display name of sender
    senderName: {
      type: String,
      required: true,
    },
    // The message text — stored encrypted in MongoDB
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-encrypt text before saving to MongoDB
messageSchema.pre("save", function (next) {
  if (this.isModified("text")) {
    this.text = encrypt(this.text);
  }
  next();
});

// Auto-decrypt text when reading from MongoDB
messageSchema.post("find", function (docs) {
  docs.forEach((doc) => {
    try { doc.text = decrypt(doc.text); } catch (_) {}
  });
});

messageSchema.post("findOne", function (doc) {
  if (doc) {
    try { doc.text = decrypt(doc.text); } catch (_) {}
  }
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
