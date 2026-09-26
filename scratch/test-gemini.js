const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

function loadEnv() {
    try {
        const envPath = path.join(__dirname, "../.env");
        if (!fs.existsSync(envPath)) return;
        const content = fs.readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const parts = trimmed.split("=");
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join("=").trim();
                process.env[key] = val;
            }
        }
    } catch (e) {
        console.error("Error loading .env", e);
    }
}
loadEnv();

async function testModel(genAI, modelName) {
    try {
        console.log(`Testing with ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Respond with the single word: OK");
        console.log(`-> Success for ${modelName}! Response:`, result.response.text());
        return true;
    } catch (err) {
        console.log(`-> Failed for ${modelName}:`, err.message || err);
        return false;
    }
}

async function run() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No key configured!");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    
    const models = [
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-pro-latest"
    ];
    for (const m of models) {
        await testModel(genAI, m);
        await new Promise(r => setTimeout(r, 1000));
    }
}
run();
