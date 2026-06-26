import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { course, company, location, additionalInfo } = await req.json();

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY environment variable" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            generationConfig: { temperature: 0.3 }
        });

        const systemPrompt = `You are a world-class Technical Career Coach and Learning Path Designer.
Your task is to generate a comprehensive, highly-structured interview preparation roadmap.
Inputs:
- Course/Skills/Role: ${course || "Not specified"}
- Target Company: ${company || "Not specified"}
- Location: ${location || "Not specified"}
- Additional Context / Skills: ${additionalInfo || "Not specified"}

Generate a detailed roadmap and return a JSON object with the following structure:
1. "overview": A concise paragraph (under 100 words) summarizing the prep strategy. Tailor it to the company and location if provided.
2. "timeline": An array of phase objects. Generate at least 3-4 phases representing steps in preparation (e.g., Week 1, Week 2, etc.). Each phase object should contain:
   - "phase": The name of the phase (e.g., "Phase 1: Algorithmic Fundamentals")
   - "duration": Timeframe for this phase (e.g., "Week 1" or "Days 1-3")
   - "description": High-level explanation of what to focus on.
   - "topics": Array of key concepts/skills to study (e.g., ["Binary Trees", "Sorting Algorithms"]).
   - "resources": Array of recommended study guides, documentations or concepts (e.g., ["MDN Docs on Web Security", "Read System Design Primer"]).
   - "tasks": Array of actionable tasks/checklist items (e.g., ["Solve 5 recursion questions", "Review resume projects"]).
3. "interviewTips": An array of specific, actionable tips tailored to the target company's interview style and the location (e.g., virtual vs on-site tips, cultural values like Amazon's Leadership Principles, googleyness, etc.).

Respond ONLY with a valid JSON block matching this structure. Do not write any markdown code blocks or explanatory text outside of the JSON.`;

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
            console.error("Failed to parse JSON response from Gemini for Roadmap:", textResponse);
            return NextResponse.json({
                overview: "Failed to generate structured roadmap overview.",
                timeline: [
                    {
                        phase: "Phase 1: Initial Preparation",
                        duration: "Week 1",
                        description: "Review fundamentals related to the job application.",
                        topics: ["Data Structures", "System Design Basics"],
                        resources: ["Standard documentation and study guides"],
                        tasks: ["Verify target company requirements", "Review resume project details"]
                    }
                ],
                interviewTips: ["Prepare for behavioral questions", "Confirm the format with the recruiter"]
            });
        }

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error("Roadmap Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate roadmap" }, { status: 500 });
    }
}
