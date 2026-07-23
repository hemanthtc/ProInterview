import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        // Enforce active session
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { aptitudePath } = await req.json();

        if (!aptitudePath || (aptitudePath !== "onCampus" && aptitudePath !== "offCampus")) {
            return NextResponse.json({ error: "Invalid or missing aptitudePath parameter" }, { status: 400 });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY environment variable" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            generationConfig: { temperature: 0.7 }
        });

        const isCampus = aptitudePath === "onCampus";

        const systemPrompt = `You are an expert interviewer creating a premium mock placement test for engineering candidates.
Your task is to generate a comprehensive placement test in strict JSON format.

Path Type: ${isCampus ? "On-Campus (Targeting Easy-to-Moderate level general aptitude & foundational coding)" : "Off-Campus (Targeting Moderate-to-High level domain technology & advanced problem-solving)"}

You MUST generate exactly:
- 25 Multiple-Choice Questions (MCQs) with 4 options each, categorized based on the path rules. Keep explanations concise.
- 3 Coding Questions with description, constraints, test cases, and starter templates. Keep starter templates compact.

Path Content Rules:
1. On-Campus Assessments:
   - MCQs: Generate a mix of:
     * Quantitative Aptitude (math, speed-distance, probability, etc.)
     * Logical Reasoning & Pattern Recognition
     * Foundational CS Technical Questions (basic DSA, programming logic, networks, SQL query basics)
   - Coding: Easy-to-Moderate algorithms (string operations, arrays, basic hash maps).
2. Off-Campus Assessments:
   - MCQs: Generate a mix of:
     * Domain-Specific Technical (system design, caching, database indexes, concurrent program execution, cloud architectures)
     * Situational Judgment (workplace simulations, client demands, code review comments, engineering ethics)
   - Coding: Moderate-to-High complexity algorithms (dynamic programming, graphs, sliding window, LRU caching design).

You MUST return a single, valid JSON block.
Do NOT wrap the JSON in Markdown formatting other than optional JSON blocks.
The JSON must adhere to the following schema structure:
{
  "mcqs": [
    {
      "id": 1,
      "category": "quantitative | logical | technical | domain | situational",
      "question": "Question text here...",
      "codeSnippet": "Optional code snippet here if applicable, otherwise omit or set to null",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0, // 0-indexed integer corresponding to correct option
      "explanation": "Detailed explanation of the solution"
    }
  ],
  "coding": [
    {
      "id": 101,
      "title": "Problem Title Here",
      "description": "Clear problem statement describing the algorithmic task, requirements, and examples.",
      "constraints": [
        "Constraints like constraints on array size, input ranges, etc."
      ],
      "examples": [
        {
          "input": "Sample inputs",
          "output": "Expected output",
          "explanation": "Detailed explanation of why this input maps to this output"
        }
      ],
      "starterTemplates": {
        "javascript": "// JavaScript Starter Code\\nfunction solution(input) {\\n\\n}",
        "python": "# Python Starter Code\\ndef solution(input):\\n    pass",
        "cpp": "// C++ Starter Code\\nclass Solution {\\npublic:\\n    void solution() {\\n        \\n    }\\n};",
        "java": "// Java Starter Code\\nclass Solution {\\n    public void solution() {\\n        \\n    }\\n}"
      }
    }
  ]
}

Ensure the questions are realistic, technically accurate, and completely unique. MCQ correctAnswers must match the index of the options array (0 to 3). Coding templates must be valid skeleton functions.`;

        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await model.generateContent(systemPrompt);
                break;
            } catch (retryErr: any) {
                const isTransient = retryErr?.status === 429 || retryErr?.status === 503 || 
                                    (retryErr?.message && (retryErr.message.includes("429") || retryErr.message.includes("503") || retryErr.message.includes("demand")));
                if (isTransient && attempt < 2) {
                    const delay = (attempt + 1) * 3000;
                    console.warn(`Gemini transient error (${retryErr?.status || '503'}), retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw retryErr;
                }
            }
        }

        if (!result) {
            return NextResponse.json({ error: "AI rate-limited after retries." }, { status: 429 });
        }

        const textResponse = result.response.text().trim();
        let parsedData;
        try {
            const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
            parsedData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse JSON response from Gemini for mock test generation:", textResponse);
            return NextResponse.json({ error: "Failed to parse mock assessment questions output from AI" }, { status: 500 });
        }

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error("Mock assessment generation error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
