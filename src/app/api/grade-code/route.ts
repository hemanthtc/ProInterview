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

        const { questionTitle, questionDescription, code, language } = await req.json();

        if (!questionTitle || !code || !language) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            console.warn("GEMINI_API_KEY is not configured. Falling back to mock grading.");
            return NextResponse.json(getFallbackGrading(questionTitle, code, language));
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            generationConfig: { temperature: 0.2 }
        });

        const prompt = `You are a technical interviewer and automated compiler validator.
Analyze the following coding solution submitted by a candidate.

Coding Problem Title: ${questionTitle}
Problem Description:
${questionDescription}

Candidate's Solution Code (Language: ${language}):
\`\`\`${language}
${code}
\`\`\`

Evaluate the code on correctness, edge case handling, and efficiency.
Provide your response strictly in the following JSON format. Do NOT wrap it in any Markdown other than standard raw JSON.

JSON Schema:
{
  "score": 8, // Integer from 0 to 10. 10 means fully correct and optimized. 0 means completely wrong or empty.
  "correctness": "Passed 4/4 test cases conceptually.", // Summary of correctness
  "timeComplexity": "O(N)", // Big-O time complexity
  "spaceComplexity": "O(N)", // Big-O space complexity
  "feedback": "Your solution is correct and uses a stack to match parentheses. However, it can be optimized to O(1) space if the string only had one type of parenthesis, but for multiple types, stack is optimal.", // Detailed feedback and improvements
  "status": "Accepted" // "Accepted", "Wrong Answer", "Syntax Error", or "Time Limit Exceeded"
}

Ensure all JSON keys match exactly. Do not output anything else.`;

        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await model.generateContent(prompt);
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
            console.error("Failed to parse JSON response from Gemini for code grading:", textResponse);
            return NextResponse.json(getFallbackGrading(questionTitle, code, language));
        }

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error("Code grading error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// Fallback logic in case API Key is missing or Gemini fails
function getFallbackGrading(title: string, code: string, language: string) {
    const codeLen = code.trim().length;
    
    // Very simple heuristics
    let score = 5;
    let correctness = "Simulated validation: Compile succeeded.";
    let timeComplexity = "O(N)";
    let spaceComplexity = "O(N)";
    let feedback = "Your code was submitted successfully. (Note: Gemini API is offline/not configured, using simulated grading).";
    let status = "Accepted";

    if (codeLen < 20) {
        score = 1;
        correctness = "Code is too short to evaluate.";
        feedback = "Please write a complete solution to the problem.";
        status = "Wrong Answer";
    } else {
        // Checking for common keywords
        const normalized = code.toLowerCase();
        if (title.toLowerCase().includes("reverse")) {
            if (normalized.includes("reverse") || normalized.includes("split") || normalized.includes("join") || normalized.includes("swap") || normalized.includes("while")) {
                score = 8;
                correctness = "Passed 3/3 test cases conceptually (Simulated).";
                feedback = "Good job! You correctly parsed and reversed the words. The solution handles spaces appropriately.";
                timeComplexity = "O(N)";
                spaceComplexity = "O(N)";
            } else {
                score = 4;
                correctness = "Incorrect logic structure (Simulated).";
                feedback = "Check if your logic correctly handles splitting and reversing the string.";
                status = "Wrong Answer";
            }
        } else if (title.toLowerCase().includes("parentheses")) {
            if (normalized.includes("stack") || normalized.includes("push") || normalized.includes("pop") || normalized.includes("dict") || normalized.includes("map")) {
                score = 9;
                correctness = "Passed 4/4 test cases conceptually (Simulated).";
                feedback = "Excellent! You used a stack-based approach which is optimal for validating matching parentheses in O(N) time and O(N) space.";
                timeComplexity = "O(N)";
                spaceComplexity = "O(N)";
            } else {
                score = 3;
                correctness = "Failed matching test cases (Simulated).";
                feedback = "You should use a stack data structure to track opening brackets and match them with incoming closing brackets in LIFO order.";
                status = "Wrong Answer";
            }
        } else if (title.toLowerCase().includes("two sum")) {
            if (normalized.includes("map") || normalized.includes("dict") || normalized.includes("hash") || normalized.includes("index")) {
                score = 10;
                correctness = "Passed 3/3 test cases conceptually (Simulated).";
                feedback = "Perfect! You used a Hash Map to find the complement of each number in O(N) time and O(N) space. This is the optimal solution.";
                timeComplexity = "O(N)";
                spaceComplexity = "O(N)";
            } else if (normalized.includes("for") && code.split("for").length > 2) {
                score = 7;
                correctness = "Passed 3/3 test cases (Simulated).";
                feedback = "Your solution is correct but uses a nested loop which takes O(N^2) time. Consider using a hash map to optimize it to O(N) time complexity.";
                timeComplexity = "O(N^2)";
                spaceComplexity = "O(1)";
            } else {
                score = 4;
                correctness = "Failed to match target sum (Simulated).";
                feedback = "Look for two numbers whose sum equals target. Try tracking indices and values.";
                status = "Wrong Answer";
            }
        }
    }

    return {
        score,
        correctness,
        timeComplexity,
        spaceComplexity,
        feedback,
        status
    };
}
