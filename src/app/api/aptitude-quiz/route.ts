import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback, parseJsonFromModel } from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";
import {
    aptitudeQuizBodySchema,
    enforceRateLimit,
    jsonError,
    parseJsonBody,
} from "@/utils/http";

const CATEGORY_LABELS: Record<string, string> = {
    logicalReasoning: "Logical Reasoning",
    quantitativeAptitude: "Quantitative Aptitude",
    technicalCoding: "Technical Coding",
    domainAssessments: "Domain Assessments",
    situationalJudgment: "Situational Judgment",
};

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const blocked = enforceRateLimit(
            `aptitude-quiz:${session.identifier}`,
            { limit: 20, windowMs: 15 * 60 * 1000 },
            "aptitude quizzes"
        );
        if (blocked) return blocked;

        const parsed = await parseJsonBody(req, aptitudeQuizBodySchema);
        if (!parsed.ok) return parsed.response;
        const { category, role, domain } = parsed.data;

        const categoryLabel = CATEGORY_LABELS[category];
        const targetContext = role ? `Target Role: ${role}` : domain ? `Career Domain: ${domain}` : "General Professional Assessment";

        const systemPrompt = `You are an expert tutor preparing candidates for professional interviews and aptitude assessments.
Candidate Context: ${targetContext}
Your task is to generate exactly 3 challenging and highly relevant multiple-choice practice questions for the category: "${categoryLabel}".

Generate questions based on this category:
- Logical Reasoning: Coding-decoding, blood relations, seating arrangements, data interpretation, logic puzzles.
- Quantitative Aptitude: Time speed & distance, permutations & probability, profit/loss, speed math, percentage, interest.
- Technical Coding: Output prediction, data structures, recursion, basic complexity, algorithms (adapt to role or standard Python/JavaScript/C).
- Domain Assessments: Relevant to ${targetContext}. If software: data structures, caching, databases, system architecture. If core engineering: digital circuits, timing, embedded microcontrollers, mechanics/signals. If business/management: unit economics, valuation, product metrics, operational workflows.
- Situational Judgment: Workplace scenarios, conflict resolution, project prioritization, stakeholder communication, professional ethics.

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
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why this answer is correct."
    }
  ]
}

Ensure the questions are realistic, technically accurate, and unique. Provide exactly 4 options. Make sure correctAnswer corresponds to the correct option index (0 to 3).`;

        const textResponse = await generateWithFallback(systemPrompt, {
            generationConfig: { temperature: 0.7 },
        });
        try {
            const parsedData = parseJsonFromModel(textResponse);
            return NextResponse.json(parsedData);
        } catch {
            console.error("Failed to parse JSON response from Gemini for aptitude quiz");
            return NextResponse.json({ error: "Failed to parse questions output from AI" }, { status: 500 });
        }
    } catch (error: unknown) {
        console.error("Aptitude quiz generation error:", error);
        return jsonError(error, 500, "Internal server error");
    }
}
