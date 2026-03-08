// backend/models/CommunityMessage.js
const mongoose = require("mongoose");

const communityMessageSchema = new mongoose.Schema(
  {
    senderEmail: { type: String, required: true, lowercase: true },
    senderName:  { type: String, required: true },
    senderDept:  { type: String, default: "" },
    text:        { type: String, required: true, trim: true },
    likes:       { type: [String], default: [] }, // array of emails who liked
    deleted:     { type: Boolean, default: false },
  },
  { timestamps: true }
  
);
// Auto-delete messages after 1 day (86400 seconds)
communityMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 });
module.exports = mongoose.model("CommunityMessage", communityMessageSchema);
