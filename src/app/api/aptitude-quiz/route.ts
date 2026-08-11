import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { category } = await req.json();

        if (!category) {
            return NextResponse.json({ error: "Missing category parameter" }, { status: 400 });
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

        const categoryLabels: Record<string, string> = {
            logicalReasoning: "Logical Reasoning",
            quantitativeAptitude: "Quantitative Aptitude",
            technicalCoding: "Technical Coding",
            domainAssessments: "Domain Assessments",
            situationalJudgment: "Situational Judgment"
        };

        const categoryLabel = categoryLabels[category] || category;

        const systemPrompt = `You are an expert tutor preparing candidates for technical interviews and aptitude assessments.
Your task is to generate exactly 3 challenging and highly relevant multiple-choice practice questions for the category: "${categoryLabel}".

Generate questions based on this category:
- Logical Reasoning: Coding-decoding, blood relations, seating arrangements, data interpretation, logic puzzles.
- Quantitative Aptitude: Time speed & distance, permutations & probability, profit/loss, speed math, percentage, interest.
- Technical Coding: Output prediction, data structures, recursion, basic complexity, algorithms (JavaScript/Python/Java style).
- Domain Assessments: AVL trees, balancing, system design (sharding, caching, microservices), complex databases, edge cases, scaling.
- Situational Judgment: Workplace scenarios, conflict resolution, project prioritization, communication, code review ethics.

You MUST return a single, valid JSON block.
Do NOT wrap the JSON in Markdown formatting other than optional JSON blocks.
The JSON must adhere to the following schema:
{
  "category": "${categoryLabel}",
  "questions": [
    {
      "id": 1,
      "question": "Question text here...",
      "codeSnippet": "Optional code snippet here if applicable, or leave empty/omit",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": 0, // 0-indexed integer corresponding to the index in the options array
      "explanation": "Detailed explanation of why this answer is correct."
    }
  ]
}

Ensure the questions are realistic, technically accurate, and unique. Provide exactly 4 options. Make sure correctAnswer corresponds to the correct option index (0 to 3).`;

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
            console.error("Failed to parse JSON response from Gemini for aptitude quiz:", textResponse);
            return NextResponse.json({ error: "Failed to parse questions output from AI" }, { status: 500 });
        }

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error("Aptitude quiz generation error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
