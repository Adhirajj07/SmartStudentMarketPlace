// backend/models/Message.js
// Stores each chat message in MongoDB

const mongoose = require("mongoose");

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
    // The message text
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

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
