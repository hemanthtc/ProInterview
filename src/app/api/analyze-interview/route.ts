import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVerifiedSession } from "@/utils/auth";
import { generateContentWithTimeout } from "@/utils/gemini";
import {
    analyzeInterviewBodySchema,
    enforceRateLimit,
    jsonError,
    parseJsonBody,
} from "@/utils/http";
import { redactPii } from "@/utils/pii";

function getQuotaFallback(transcript: string) {
    return NextResponse.json({
        technicalRating: 0,
        behavioralRating: 0,
        communicationRating: 0,
        summary: "- Interview evaluation is temporarily unavailable because the Gemini quota was exhausted.\n- Please try again later or re-run the analysis after the quota resets.",
        annotatedTranscript: transcript,
    });
}

export async function POST(req: NextRequest) {
    let transcript = "";
    try {
        // Enforce active session
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const blocked = enforceRateLimit(
            `analyze-interview:${session.identifier}`,
            { limit: 20, windowMs: 15 * 60 * 1000 },
            "interview analysis"
        );
        if (blocked) return blocked;

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
        }
        const genAI = new GoogleGenerativeAI(API_KEY);

        const parsedBody = await parseJsonBody(req, analyzeInterviewBodySchema, 2_000_000);
        if (!parsedBody.ok) return parsedBody.response;
        const { messages, snapshots, company, roles, level, companyClone } = parsedBody.data;

        transcript = redactPii(
            messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")
        );

        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { temperature: 0.0 } });

        let mappedType = "off-campus";
        if (companyClone === false) {
            if (level === "basic") mappedType = "internship";
            else mappedType = "on-campus";
        } else {
            if (level === "basic") mappedType = "internship";
            else if (level === "intermediate") mappedType = "off-campus";
            else mappedType = "experienced";
        }

        const recruitmentModeBlock = `
EVALUATION CONTEXT: ${mappedType.toUpperCase()} PLACEMENT RECRUITMENT DRIVE (Target Role: ${roles || "Software Engineer"} at ${company || "a tech company"}, Level: ${level || "intermediate"})
- Rubric Calibration:
  * INTERNSHIP: Grade based on basic programming concepts, code syntax correctness, learning potential, agility, and college projects.
  * ON-CAMPUS: Grade based on Computer Science core theoretical foundations: OOP concepts, Database Management (Normalization normal forms, ACID, keys), Operating System principles (concurrency, threads vs processes, paging), Networks, and standard Data Structures & Algorithms. Acknowledge academic correctness and foundational logic.
  * OFF-CAMPUS: Grade based on practical application building, systems integration, code quality, unit/integration testing, API structures, and logical scaling.
  * EXPERIENCED: Grade based on advanced system design, horizontal scaling, security, distributed system failure recovery, Sprint prioritization, and work history.
`;

        const systemPrompt = `You are a highly analytical, strict, and precise technical interviewer evaluating a candidate's performance.

Transcript:
${transcript}

${recruitmentModeBlock}

Assess their performance fairly and realistically across these vectors:
- Technical accuracy: Are their answers correct according to the active recruitment style?
- Clarity of explanation: Do they communicate complex topics well?
- Behavior & Professionalism: Evaluate their demeanor. If camera snapshots are provided, consider their eye contact, posture, and facial expressions during the interview.

CRITICAL FAILURE CONDITIONS:
- If the transcript consists mostly of the interviewer asking questions and the candidate providing very short, empty, or evasive answers with no substance, or if the candidate didn't answer anything at all, ALL RATINGS MUST BE EXTREMELY LOW (0-10). Do not give them a 50 just for showing up or answering one question.

Provide a response in strict JSON format with exactly five keys:
1. "technicalRating": A numerical score (0-100). Default to 0 if they answered no questions or provided no technical substance.
2. "behavioralRating": A numerical score (0-100). Factor in the camera snapshots if available. Give a 0 if they failed to participate or were hostile.
3. "communicationRating": A numerical score (0-100). Default to 0 if they barely spoke or gave one-word non-answers.
4. "summary": A bulleted list of actionable key takeaways and performance feedback. DO NOT include the correct answers to questions here. Explain why they scored poorly if they did.
5. "annotatedTranscript": This is the MOST IMPORTANT field. You MUST follow these rules EXACTLY:
   - Reproduce the FULL transcript, preserving every single exchange.
   - Format each exchange as: "INTERVIEWER: <question>" followed by "CANDIDATE: <their answer>".
   - After EVERY candidate response, you MUST evaluate whether their answer was correct, partially correct, incorrect, or missing.
   - If the candidate answered INCORRECTLY, INCOMPLETELY, or DID NOT ANSWER AT ALL, you MUST append a correction block IMMEDIATELY after their response, formatted EXACTLY as:
     "[CORRECT ANSWER: <provide the full, detailed, technically accurate answer to the question here>]"
   - If the candidate answered correctly, append: "[VERDICT: Correct]"
   - Separate each Q&A exchange with THREE blank lines (use "\\n\\n\\n\\n" between exchanges).
   - DO NOT skip any questions. Every single question must have an evaluation.
   - The correct answers must be DETAILED and TECHNICALLY ACCURATE, not just one-liners.

DO NOT wrap the response in markdown blocks like \`\`\`json. Just output raw valid JSON.`;

        const promptParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
            { text: systemPrompt },
        ];
        
        if (snapshots && snapshots.length > 0) {
            promptParts.push({ text: "\nHere are visual snapshots of the candidate taken during the interview. Please analyze their facial expressions, eye contact, and posture for the behavioral score:\n" });
            snapshots.forEach((base64: string) => {
                promptParts.push({
                    inlineData: {
                        data: base64,
                        mimeType: "image/jpeg"
                    }
                });
            });
        }

        // Retry logic for 429 rate-limit errors
        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await generateContentWithTimeout(model.generateContent(promptParts), 45000);
                break;
            } catch (retryErr: any) {
                if (retryErr?.status === 429) {
                    console.warn("Gemini quota exhausted for interview evaluation; returning fallback analysis.");
                    return getQuotaFallback(transcript);
                }

                if (retryErr?.status === 429 && attempt < 2) {
                    const delay = (attempt + 1) * 5000; // 5s, 10s
                    console.warn(`Gemini 429 rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/3)`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw retryErr;
                }
            }
        }
        if (!result) {
            return getQuotaFallback(transcript);
        }
        let technicalRating = 0;
        let behavioralRating = 0;
        let communicationRating = 0;
        let summary = "";
        let annotatedTranscript = transcript;
        
        try {
            const rawText = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsed = JSON.parse(rawText);
            technicalRating = typeof parsed.technicalRating === "number" ? Math.max(0, Math.min(100, parsed.technicalRating)) : 0;
            behavioralRating = typeof parsed.behavioralRating === "number" ? Math.max(0, Math.min(100, parsed.behavioralRating)) : 0;
            communicationRating = typeof parsed.communicationRating === "number" ? Math.max(0, Math.min(100, parsed.communicationRating)) : 0;
            summary = parsed.summary || "";
            annotatedTranscript = parsed.annotatedTranscript || transcript;
        } catch (e) {
            console.error("Failed to parse JSON from Gemini:", result.response.text().substring(0, 500));
        }

        return NextResponse.json({ technicalRating, behavioralRating, communicationRating, summary, annotatedTranscript });
    } catch (error: unknown) {
        console.error("Interview Evaluation Error:", error);
        const status = typeof error === "object" && error && "status" in error ? (error as { status?: number }).status : undefined;
        const message = error instanceof Error ? error.message : "";
        if (status === 429 || message.includes("quota")) {
            return getQuotaFallback(transcript);
        }
        return jsonError(error, 500, "Failed to evaluate interview");
    }
}
