// backend/routes/communityRoutes.js
const express = require("express");
const router = express.Router();
const CommunityMessage = require("../models/CommunityMessage");
const { protect } = require("../middleware/authMiddleware");

// GET /api/community — fetch last 100 messages
router.get("/", protect, async (req, res) => {
  try {
    const messages = await CommunityMessage.find({ deleted: false })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: "Could not fetch messages." });
  }
});

// POST /api/community — post a new message (AI check done on frontend via /api/ai-check)
router.post("/", protect, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: "Message cannot be empty." });
  if (text.trim().length > 300) return res.status(400).json({ message: "Message too long (max 300 chars)." });

  try {
    const msg = await CommunityMessage.create({
      senderEmail: req.user.email,
      senderName:  req.user.name || req.user.email.split("@")[0],
      senderDept:  req.user.department && req.user.year ? `${req.user.department} ${req.user.year}` : "",
      text: text.trim(),
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: "Could not post message." });
  }
});

// DELETE /api/community/:id — delete own message
router.delete("/:id", protect, async (req, res) => {
  try {
    const msg = await CommunityMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found." });
    if (msg.senderEmail !== req.user.email) return res.status(403).json({ message: "Not your message." });

    msg.deleted = true;
    await msg.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Could not delete message." });
  }
});

// POST /api/community/:id/like — toggle like
router.post("/:id/like", protect, async (req, res) => {
  try {
    const msg = await CommunityMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found." });

    const email = req.user.email;
    const idx = msg.likes.indexOf(email);
    if (idx === -1) {
      msg.likes.push(email);
    } else {
      msg.likes.splice(idx, 1);
    }
    await msg.save();
    res.json({ likes: msg.likes.length, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ message: "Could not like message." });
  }
});

module.exports = router;
