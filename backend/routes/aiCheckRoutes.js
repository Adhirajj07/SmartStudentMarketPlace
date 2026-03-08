// backend/routes/aiCheckRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Rotate through multiple Gemini API keys
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
].filter(Boolean); // removes any undefined keys

let currentKeyIndex = 0;

async function callGemini(prompt) {
  const totalKeys = GEMINI_KEYS.length;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const key = GEMINI_KEYS[currentKeyIndex];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await response.json();

    // If rate limited, rotate to next key and retry
    if (!response.ok && data?.error?.code === 429) {
      console.log(`Gemini key ${currentKeyIndex + 1} rate limited — trying next key...`);
      currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
      continue;
    }

    // Any other API error
    if (!response.ok) {
      console.error(`Gemini API error on key ${currentKeyIndex + 1}:`, data);
      throw new Error("Gemini API error");
    }

    // Success — keep using this key next time
    return data;
  }

  // All keys exhausted
  throw new Error("All Gemini API keys are rate limited. Please try again later.");
}

router.post("/", protect, async (req, res) => {
  const { name, description, category } = req.body;
  if (!name || !description) {
    return res.status(400).json({ message: "Name and description are required." });
  }

  try {
    const prompt = `You are a safety checker for a college marketplace in India.
Is this content legal and appropriate for college students?
Name: ${name}
Category: ${category}
Description: ${description}

Reply with ONLY a JSON object, no markdown, no backticks:
{"allowed":true}
or
{"allowed":false,"reason":"short reason"}`;

    const data = await callGemini(prompt);

    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return res.status(500).json({ message: "Unexpected AI response. Please try again." });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);

  } catch (error) {
    console.error("AI check error:", error.message);
    return res.status(503).json({ message: error.message || "AI check unavailable. Please try again later." });
  }
});

module.exports = router;
