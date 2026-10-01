import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback, parseJsonFromModel } from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        // Enforce active session
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { sessions } = await req.json();

        if (!sessions || sessions.length === 0) {
            return NextResponse.json({ guidance: null, error: "No sessions provided." }, { status: 400 });
        }

        const sessionSummaries = sessions.map((s: any, idx: number) => {
            const date = new Date(s.timestamp).toLocaleDateString();
            return `Session ${idx + 1} (${date}):
- Final Score: ${s.finalScore ?? "N/A"}/100
- Interview Rating: ${s.interviewRating ?? "N/A"}/100
- Portfolio Rating: ${s.portfolioRating ?? "N/A"}/100
- Summary: ${s.summary ?? "No summary available."}`;
        }).join("\n\n");

        const prompt = `You are an elite technical career coach and interview specialist. A candidate has shared their recent interview session history with you. Analyze their performance trends and provide highly personalized, actionable coaching guidance.

Here is their interview history (from newest to oldest):

${sessionSummaries}

Based on this data, provide a structured coaching report with:
1. **Overall Trend Analysis** – Are they improving, stagnating, or declining? Be specific with evidence from the scores.
2. **Top Strengths** – What are they clearly doing well? Identify 2-3 specific strong areas.
3. **Critical Improvement Areas** – What are the 3 most impactful things they need to work on? Be direct and specific.
4. **Actionable Practice Plan** – Give specific, concrete steps they can take this week to improve. Include resources or techniques where relevant.
5. **Motivational Insight** – End with a short, genuine, encouraging note based on their actual progress.

Be honest, empathetic, and concise. Do not be vague. Format your response clearly with the numbered sections above.`;

        const text = await generateWithFallback(prompt, {
            generationConfig: { temperature: 0.7 }
        });

        return NextResponse.json({ guidance: text });
    } catch (err: any) {
        console.error("Profile guidance error:", err);
        const status = err?.status === 429 ? 429 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
