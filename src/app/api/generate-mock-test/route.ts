import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback, parseJsonFromModel } from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";
import {
    enforceRateLimit,
    jsonError,
    mockTestBodySchema,
    parseJsonBody,
} from "@/utils/http";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const blocked = enforceRateLimit(
            `generate-mock-test:${session.identifier}`,
            { limit: 8, windowMs: 15 * 60 * 1000 },
            "mock tests"
        );
        if (blocked) return blocked;

        const parsed = await parseJsonBody(req, mockTestBodySchema);
        if (!parsed.ok) return parsed.response;
        const { aptitudePath, role, domain } = parsed.data;

        const isCampus = aptitudePath === "onCampus";
        const candidateContext = role ? `Target Role: ${role}` : domain ? `Discipline: ${domain}` : "Engineering & Professional Candidate";

        const systemPrompt = `You are an expert interviewer creating a premium mock placement assessment for job candidates.
Candidate Context: ${candidateContext}
Your task is to generate a comprehensive placement test in strict JSON format.

Path Type: ${isCampus ? "On-Campus (Targeting Easy-to-Moderate level aptitude, logic & foundational problem solving)" : "Off-Campus (Targeting Moderate-to-High level domain competency & advanced problem-solving)"}

You MUST generate exactly:
- 25 Multiple-Choice Questions (MCQs) with 4 options each, categorized based on the path rules. Keep explanations concise.
- 3 Practical/Coding Problem-Solving Questions with description, constraints, test cases, and starter templates (in JavaScript, Python, or standard pseudo-code). Keep starter templates compact.

Path Content Rules:
1. On-Campus Assessments:
   - MCQs: Generate a balanced mix of:
     * Quantitative Aptitude (math, speed-distance, probability, ratios, etc.)
     * Logical Reasoning & Pattern Recognition
     * Foundational Domain/Technical Questions (calibrated to ${candidateContext}: CS/code logic for software, circuits/mechanics for core, or data/financial reasoning for business)
   - Practical/Coding: 3 foundational algorithmic or numerical problem-solving tasks suitable for the candidate's level.
2. Off-Campus Assessments:
   - MCQs: Generate a mix of:
     * Domain-Specific Competencies (system architecture/caching for tech, hardware/control systems for core, or business strategy/metrics for business roles)
     * Situational Judgment (workplace simulations, client demands, cross-functional alignment, professional ethics)
   - Practical/Coding: 3 applied problem-solving challenges (algorithms, data manipulation, or scenario logic).

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

        const textResponse = await generateWithFallback(systemPrompt, {
            generationConfig: { temperature: 0.7 },
        });
        let parsedData;
        try {
            parsedData = parseJsonFromModel(textResponse);
        } catch {
            console.error("Failed to parse JSON response from Gemini for mock test generation");
            return NextResponse.json({ error: "Failed to parse mock assessment questions output from AI" }, { status: 500 });
        }

        return NextResponse.json(parsedData);
    } catch (error: unknown) {
        console.error("Mock assessment generation error:", error);
        return jsonError(error, 500, "Internal server error");
    }
}
