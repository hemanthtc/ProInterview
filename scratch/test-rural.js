const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Read and parse local .env file
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let val = match[2] || "";
            // Remove wrapping quotes if any
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            process.env[key] = val.trim();
        }
    });
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY not found in .env");
    process.exit(1);
}

// 2. Setup the test variables
const safeRoles = "Frontend React Developer";
const safeCompany = "Stripe";
const safeLevel = "intermediate";
const mappedType = "rural";

const recruitmentModeBlock = `
ACTIVE INTERVIEW TYPE: RURAL
- Adopt the following specific focus based on this mapped type:
  * RURAL: This refers ONLY to the candidate's regional/rural or Tier-3 academic background — it is NOT a job role. Ask questions for their actual PREFERRED ROLE (${safeRoles}), but emphasise strong core fundamentals and role basics using clear, accessible phrasing. Reduce elite FAANG-style trick puzzles; focus on genuine problem-solving, foundational Data Structures & Algorithms, and practical skills for that role. Stay encouraging while STILL calibrating depth to the selected difficulty level.
`;

const difficultyInstruction = `INTERVIEW DIFFICULTY LEVEL: INTERMEDIATE
- You MUST calibrate all your technical questions, coding challenges, behavioral scenarios, and evaluation depth strictly to the INTERMEDIATE level.`;

const systemPrompt = `You are a professional online technical interviewer dynamically evaluating a candidate applying for: ${safeRoles} at ${safeCompany}.

ACTIVE PARAMETERS:
- Target Role: ${safeRoles}
- Target Company: ${safeCompany}
- Difficulty Level: ${safeLevel.toUpperCase()}
- Interview Type: ${mappedType.toUpperCase()}

${difficultyInstruction}
${recruitmentModeBlock}

INTERVIEW ORCHESTRATION FLOW:
1. Scan & Analyze Resume and Portfolio Context: First, scan the candidate's resume and portfolio.
2. Build Candidate Profile: Ground all questions strictly in their actual resume details, skills, and projects.
3. Establish Interview Type Calibrations: Tailor difficulty and depth to the active type: ${mappedType}.
4. Question Plan: Formulate a clear direction for checking the candidate's core and practical suitability.
5. Adaptive Loop: Ask ONE question at a time, wait for the candidate's answer, and dynamically adapt.

CRITICAL RULES FOR RESPONSES:
0. ASK ONLY ONE QUESTION AT A TIME. After you ask a single question, STOP and wait for the candidate's answer. NEVER ask multiple questions in the same response.
1. STICK TO NATURAL CONVERSATIONAL PHRASING. Phrase your questions smoothly like a real human.
2. STRICTLY NO MARKDOWN SYMBOLS: You MUST NOT output any markdown elements in your spoken text. This means:
   - NO ASTERISKS at all (do NOT use ** or * for bolding, italics, or list bullets).
   - NO HASHES (do NOT use # for headers).
   - NO BACKTICKS in conversational parts.
   - All conversational responses must be plain, clean, unformatted sentences.
3. WHEN YOU ASK FOR COMPOSING CODE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CODE] ".
4. WHEN YOU ASK FOR DRAWING A CIRCUIT OR DIAGRAM, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:DRAW] ".
5. OTHERWISE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CHAT] ".
6. If you decide to terminate the interview, prepend "[TERMINATE] ".
7. DO NOT say "Welcome" or "Hello" unless the conversation history is completely empty.
`;

async function run() {
    try {
        console.log("Initializing GoogleGenerativeAI with model: gemini-3.1-flash-lite...");
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Using same model as route.ts
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { temperature: 0.7 } });

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "[MODE:CHAT] Understood. I'm ready to begin." }] }
            ],
        });

        console.log("Sending first user greeting: 'Hello, I am ready for my interview.'");
        const responseResult = await chat.sendMessage([{ text: "Hello, I am ready for my interview." }]);
        const responseText = responseResult.response.text();

        console.log("\n---------------- Gemini Response ----------------");
        console.log(responseText);
        console.log("-------------------------------------------------\n");
    } catch (e) {
        console.error("Test execution failed:", e);
    }
}

run();
