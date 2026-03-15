require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = "AIzaSyA2g5zmC9ZdEBMb2y5EOVYHBEIM0fLqidY";
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Using the latest stable flash model found in the list
  const modelName = "gemini-2.5-flash";

  try {
    console.log(`Testing with '${modelName}'...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, are you active?");
    console.log(`✅ Success with ${modelName}:`, result.response.text());
  } catch (err) {
    console.error(`❌ ${modelName} failed:`, err.message);
    if (err.message.includes("429")) {
      console.log("💡 Suggestion: Your API key is valid, but you have exceeded your current quota. Please check your billing or rate limits at https://aistudio.google.com/");
    }
  }
}

listModels();
