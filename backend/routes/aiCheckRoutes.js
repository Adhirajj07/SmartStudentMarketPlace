// backend/routes/aiCheckRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, async (req, res) => {
  const { name, description, category } = req.body;

  if (!name || !description) {
    return res.status(400).json({ message: "Name and description are required." });
  }

  try {
    const prompt = `You are a product safety checker for a college marketplace in India.
Check if this product is illegal or inappropriate:
Product: ${name}
Category: ${category}
Description: ${description}

Legal: books, electronics, stationery, hostel items, accessories, gadgets, clothes.
Illegal: drugs, weapons, alcohol, tobacco, adult content, pirated items, stolen goods.

Respond with ONLY valid JSON, nothing else:
{"allowed":true}
OR
{"allowed":false,"reason":"short reason"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 500 }
        })
      }
    );

    const data = await response.json();
    console.log("Full Gemini response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.json({ allowed: false, reason: "Safety check failed. Please try again." });
    }

    // Safely extract text
    const candidate = data?.candidates?.[0];
    const raw = candidate?.content?.parts?.[0]?.text?.trim() || "";
    console.log("Gemini text:", raw);

    if (!raw) {
      // Check finishReason
      console.log("Finish reason:", candidate?.finishReason);
      // If no text but model responded, default based on finish reason
      if (candidate?.finishReason === "STOP") {
        return res.json({ allowed: true });
      }
      return res.json({ allowed: false, reason: "Safety check failed. Please try again." });
    }

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({ allowed: false, reason: "Safety check failed. Please try again." });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);

  } catch (error) {
    console.error("AI check error:", error.message);
    res.json({ allowed: false, reason: "Safety check unavailable. Please try again." });
  }
});

module.exports = router;
