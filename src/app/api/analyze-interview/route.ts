import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { generateWithFallback } from "@/utils/gemini";
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
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const blocked = enforceRateLimit(
            `analyze-interview:${session.identifier}`,
            { limit: 20, windowMs: 15 * 60 * 1000 },
            "interview analysis"
        );
        if (blocked) return blocked;



        const parsedBody = await parseJsonBody(req, analyzeInterviewBodySchema, 2_000_000);
        if (!parsedBody.ok) return parsedBody.response;
        const { messages, snapshots, company, roles, level, companyClone } = parsedBody.data;

        transcript = redactPii(
            messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")
        );

        let mappedType = "off-campus";
        if (companyClone === false) {
            if (level === "basic") mappedType = "internship";
            else mappedType = "on-campus";
        } else {
            if (level === "basic") mappedType = "internship";
            else if (level === "intermediate") mappedType = "off-campus";
            else mappedType = "experienced";
        }

        const targetRole = roles || "Candidate Target Role";
        const targetOrg = company || "Target Organization";

        const recruitmentModeBlock = `
EVALUATION CONTEXT: ${mappedType.toUpperCase()} PLACEMENT RECRUITMENT DRIVE (Target Role: ${targetRole} at ${targetOrg}, Level: ${level || "intermediate"})
- Rubric Calibration (Calibrated to Target Role: ${targetRole}):
  * INTERNSHIP: Grade based on baseline domain fundamentals, problem-solving reasoning, learning potential, agility, and college projects.
  * ON-CAMPUS: Grade based on foundational core academic concepts and subject depth relevant to the candidate's study area and target role.
  * OFF-CAMPUS: Grade based on practical execution, applied workflows, solution quality, and professional problem-solving.
  * EXPERIENCED: Grade based on advanced domain/system architecture, scalability, risk trade-offs, stakeholder leadership, and track record.
`;

        const systemPrompt = `You are a highly analytical, strict, and precise interview evaluator analyzing a candidate's performance.

Transcript:
${transcript}

${recruitmentModeBlock}

Assess their performance fairly and realistically across these vectors:
- Domain & Technical accuracy: Are their answers correct, deep, and appropriate for ${targetRole}?
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

        let rawResponseText = "";
        try {
            rawResponseText = await generateWithFallback(promptParts, {
                generationConfig: { temperature: 0.0 },
                timeout: 45000,
            });
        } catch (genErr: any) {
            console.warn("generateWithFallback analyze-interview error:", genErr?.message || genErr);
            return getQuotaFallback(transcript);
        }

        if (!rawResponseText) {
            return getQuotaFallback(transcript);
        }

        let technicalRating = 0;
        let behavioralRating = 0;
        let communicationRating = 0;
        let summary = "";
        let annotatedTranscript = transcript;
        
        try {
            const rawText = rawResponseText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsed = JSON.parse(rawText);
            technicalRating = typeof parsed.technicalRating === "number" ? Math.max(0, Math.min(100, parsed.technicalRating)) : 0;
            behavioralRating = typeof parsed.behavioralRating === "number" ? Math.max(0, Math.min(100, parsed.behavioralRating)) : 0;
            communicationRating = typeof parsed.communicationRating === "number" ? Math.max(0, Math.min(100, parsed.communicationRating)) : 0;
            if (Array.isArray(parsed.summary)) {
                summary = parsed.summary.map((s: any) => `- ${typeof s === 'string' ? s : JSON.stringify(s)}`).join("\n");
            } else {
                summary = typeof parsed.summary === "string" ? parsed.summary : (parsed.summary ? JSON.stringify(parsed.summary) : "");
            }
            if (Array.isArray(parsed.annotatedTranscript)) {
                annotatedTranscript = parsed.annotatedTranscript.map((t: any) => typeof t === 'string' ? t : JSON.stringify(t)).join("\n\n");
            } else {
                annotatedTranscript = typeof parsed.annotatedTranscript === "string" ? parsed.annotatedTranscript : transcript;
            }
        } catch (e) {
            console.error("Failed to parse JSON from Gemini:", rawResponseText.substring(0, 500));
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
