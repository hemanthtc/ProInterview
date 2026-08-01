import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVerifiedSession } from "@/utils/auth";

export interface NegotiateResult {
    reply: string;
    coachNote: string;
    suggestedScript: string;
    levers: string[];
    redLines: string[];
    mood: "collaborative" | "firm" | "curious" | "pressured" | "warm" | "neutral";
}

function fallbackNegotiate(mode: string, userMessage: string, targetComp?: string): NegotiateResult {
    const isCoach = mode === "coach";
    return {
        reply: isCoach
            ? "Lead with enthusiasm for the role, then anchor on market data and your unique impact. Ask what flexibility exists across base, equity, and signing."
            : `Thanks for sharing the offer details. I'm excited about the role. Based on the scope and my market research, I was hoping we could land closer to ${targetComp || "my target range"}. Is there room to discuss base or a signing bonus?`,
        coachNote:
            "Stay collaborative — negotiate the package, not the person. Trade concessions (start date, level) only for concrete gains.",
        suggestedScript: userMessage?.trim()
            ? `Refined: "${userMessage.trim().slice(0, 180)} — and I'd love to understand which levers are most flexible on your side."`
            : "I'm thrilled about joining. To make this work long-term, could we explore adjusting base or equity toward my target?",
        levers: ["Base salary", "Signing bonus", "Equity / RSUs", "Start date", "Level / title", "Remote flexibility"],
        redLines: ["Don't invent competing offers", "Don't apologize for asking", "Don't accept on the spot under pressure"],
        mood: "collaborative",
    };
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const {
            company = "",
            role = "",
            currentOffer = "",
            benefits = "",
            targetComp = "",
            batna = "",
            history = [],
            userMessage = "",
            mode = "coach",
        } = body;

        const safeMode = mode === "simulate" ? "simulate" : "coach";

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(fallbackNegotiate(safeMode, userMessage, targetComp));
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { temperature: 0.45 },
        });

        const historyText = Array.isArray(history)
            ? history
                  .slice(-12)
                  .map((h: any) => `${h.role || "user"}: ${h.content || h.text || ""}`)
                  .join("\n")
            : "";

        const prompt = `You are an expert compensation negotiation coach for tech / professional roles.

Mode: ${safeMode}
- If mode is "simulate": reply AS the hiring manager / recruiter responding to the candidate's latest message.
- If mode is "coach": reply AS a private coach advising the candidate (not as the company).

Context:
Company: ${company || "Unknown"}
Role: ${role || "Unknown"}
Current offer: ${currentOffer || "not specified"}
Benefits: ${benefits || "not specified"}
Candidate target: ${targetComp || "not specified"}
BATNA / alternatives: ${batna || "not specified"}

Conversation so far:
"""
${historyText || "(none)"}
"""

Latest candidate message:
"""
${userMessage || "(opening)"}
"""

Return ONLY valid JSON (no markdown fences):
{
  "reply": "main response text (recruiter voice if simulate, coach voice if coach)",
  "coachNote": "1-2 sentences of private coaching insight (always useful, even in simulate)",
  "suggestedScript": "a polished 2-4 sentence script the candidate can say next",
  "levers": ["3-6 negotiation levers relevant to this package"],
  "redLines": ["2-4 things the candidate should avoid"],
  "mood": "collaborative" | "firm" | "curious" | "pressured" | "warm" | "neutral"
}

Be practical, ethical, and specific to the numbers/context given.`;

        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await model.generateContent(prompt);
                break;
            } catch (retryErr: any) {
                const isTransient =
                    retryErr?.status === 429 ||
                    retryErr?.status === 503 ||
                    (retryErr?.message &&
                        (retryErr.message.includes("429") ||
                            retryErr.message.includes("503") ||
                            retryErr.message.includes("demand")));
                if (isTransient && attempt < 2) {
                    await new Promise((r) => setTimeout(r, (attempt + 1) * 3000));
                } else {
                    console.warn("Negotiate Gemini failed; using fallback.", retryErr?.message || retryErr);
                    return NextResponse.json(fallbackNegotiate(safeMode, userMessage, targetComp));
                }
            }
        }

        if (!result) {
            return NextResponse.json(fallbackNegotiate(safeMode, userMessage, targetComp));
        }

        try {
            const rawText = result.response
                .text()
                .trim()
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
            const parsed = JSON.parse(rawText);
            const moodOptions = ["collaborative", "firm", "curious", "pressured", "warm", "neutral"] as const;
            const mood = moodOptions.includes(parsed.mood) ? parsed.mood : "collaborative";

            const payload: NegotiateResult = {
                reply: String(parsed.reply || ""),
                coachNote: String(parsed.coachNote || ""),
                suggestedScript: String(parsed.suggestedScript || ""),
                levers: Array.isArray(parsed.levers) ? parsed.levers.map(String).slice(0, 8) : [],
                redLines: Array.isArray(parsed.redLines) ? parsed.redLines.map(String).slice(0, 6) : [],
                mood,
            };

            if (!payload.reply) {
                return NextResponse.json(fallbackNegotiate(safeMode, userMessage, targetComp));
            }

            return NextResponse.json(payload);
        } catch (parseErr) {
            console.error("Negotiate JSON parse failed:", parseErr);
            return NextResponse.json(fallbackNegotiate(safeMode, userMessage, targetComp));
        }
    } catch (error: any) {
        console.error("Negotiate error:", error);
        return NextResponse.json({ error: error.message || "Negotiation assist failed" }, { status: 500 });
    }
}
