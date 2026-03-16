require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY not found in .env file.");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Using the latest stable flash model
  const modelName = "gemini-2.5-flash";

  try {
    console.log(`Testing connection with '${modelName}'...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, are you active?");
    console.log(`✅ Success: Gemini is active and responding.`);
    console.log(`Model Response: "${result.response.text().trim()}"`);
  } catch (err) {
    if (err.message.includes("403")) {
      console.error(`❌ FAILED (403 Forbidden): Your API key might be flagged or leaked. Please generate a new one at https://aistudio.google.com/`);
    } else if (err.message.includes("429")) {
      console.error(`❌ FAILED (429 Too Many Requests): Quota exceeded. Check your limits.`);
    } else {
      console.error(`❌ FAILED: ${err.message}`);
    }
  }
}

listModels();
