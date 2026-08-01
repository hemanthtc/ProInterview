import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVerifiedSession } from "@/utils/auth";

export interface FilmAnnotation {
    t: number;
    label: string;
    kind: "strength" | "gap" | "moment" | "tip";
    quote?: string;
    note: string;
}

export interface FilmRoomResult {
    title: string;
    overallTake: string;
    annotations: FilmAnnotation[];
    keyMoments: string[];
    practiceFocus: string[];
    fallback?: boolean;
}

function fallbackFilm(transcript: string, summary?: string, scores?: any): FilmRoomResult {
    const lines = (transcript || "")
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
    const candidateLines = lines.filter((l) => /^(YOU|CANDIDATE|USER):/i.test(l));
    const annotations: FilmAnnotation[] = [];

    candidateLines.slice(0, 6).forEach((line, i) => {
        const quote = line.replace(/^(YOU|CANDIDATE|USER):\s*/i, "").slice(0, 140);
        annotations.push({
            t: i * 45,
            label: i % 2 === 0 ? "Answer beat" : "Delivery note",
            kind: i % 3 === 0 ? "gap" : i % 3 === 1 ? "strength" : "tip",
            quote,
            note:
                i % 3 === 0
                    ? "Tighten structure — lead with the outcome, then cover 2 actions."
                    : i % 3 === 1
                      ? "Solid substance here — keep this as a reusable STAR bullet."
                      : "Pause briefly before diving in; it reads as more confident.",
        });
    });

    if (annotations.length === 0) {
        annotations.push(
            {
                t: 0,
                label: "Open strong",
                kind: "tip",
                note: "Start with a 15-second pitch of your background mapped to the role.",
            },
            {
                t: 60,
                label: "Depth check",
                kind: "moment",
                note: "When asked a technical question, state trade-offs before code details.",
            },
            {
                t: 120,
                label: "Close clean",
                kind: "strength",
                note: "End answers with impact metrics or what you would do differently.",
            }
        );
    }

    const tech = typeof scores?.technical === "number" ? scores.technical : scores?.technicalRating;
    const behavioral = typeof scores?.behavioral === "number" ? scores.behavioral : scores?.behavioralRating;
    const communication =
        typeof scores?.communication === "number" ? scores.communication : scores?.communicationRating;

    const practiceFocus: string[] = [];
    if (typeof tech === "number" && tech < 70) practiceFocus.push("Technical depth & edge cases");
    if (typeof behavioral === "number" && behavioral < 70) practiceFocus.push("STAR behavioral stories");
    if (typeof communication === "number" && communication < 70) practiceFocus.push("Concise delivery / filler control");
    if (practiceFocus.length === 0) practiceFocus.push("Polish one signature story", "System design trade-offs");

    return {
        title: "Film Room Replay",
        overallTake:
            summary?.slice(0, 280) ||
            "Rewatch your answers like game film — mark strengths, cut fluff, and drill the weakest moments.",
        annotations,
        keyMoments: annotations.slice(0, 3).map((a) => a.label),
        practiceFocus: practiceFocus.slice(0, 4),
        fallback: true,
    };
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const transcript = typeof body.transcript === "string" ? body.transcript : "";
        const summary = typeof body.summary === "string" ? body.summary : "";
        const scores = body.scores || {};

        if (!transcript.trim()) {
            return NextResponse.json({ error: "transcript is required" }, { status: 400 });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(fallbackFilm(transcript, summary, scores));
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { temperature: 0.35 },
        });

        const prompt = `You are an interview film-room coach. Annotate this mock interview like sports game film.

Transcript:
"""
${transcript.slice(0, 14000)}
"""

Prior summary (may be empty):
"""
${(summary || "").slice(0, 2000)}
"""

Scores (may be partial): ${JSON.stringify(scores)}

Return ONLY valid JSON (no markdown fences):
{
  "title": "short title for this replay",
  "overallTake": "2-3 sentence coaching takeaway",
  "annotations": [
    {
      "t": 0,
      "label": "short label",
      "kind": "strength" | "gap" | "moment" | "tip",
      "quote": "optional short quote from candidate",
      "note": "specific coaching note"
    }
  ],
  "keyMoments": ["3-5 short strings"],
  "practiceFocus": ["2-4 drill topics"]
}

Rules:
- Produce 5-10 annotations spaced across the conversation (t = approx seconds from start).
- Be specific to this transcript — quote real moments when possible.
- Prefer actionable notes over generic praise.`;

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
                    console.warn("Film-room Gemini failed; using fallback.", retryErr?.message || retryErr);
                    return NextResponse.json(fallbackFilm(transcript, summary, scores));
                }
            }
        }

        if (!result) {
            return NextResponse.json(fallbackFilm(transcript, summary, scores));
        }

        try {
            const rawText = result.response
                .text()
                .trim()
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
            const parsed = JSON.parse(rawText);
            const annotations: FilmAnnotation[] = Array.isArray(parsed.annotations)
                ? parsed.annotations.map((a: any, i: number) => ({
                      t: typeof a.t === "number" ? a.t : i * 40,
                      label: String(a.label || `Beat ${i + 1}`),
                      kind: ["strength", "gap", "moment", "tip"].includes(a.kind) ? a.kind : "moment",
                      quote: a.quote ? String(a.quote).slice(0, 200) : undefined,
                      note: String(a.note || ""),
                  }))
                : [];

            if (annotations.length === 0) {
                return NextResponse.json(fallbackFilm(transcript, summary, scores));
            }

            return NextResponse.json({
                title: String(parsed.title || "Film Room Replay"),
                overallTake: String(parsed.overallTake || summary || ""),
                annotations,
                keyMoments: Array.isArray(parsed.keyMoments)
                    ? parsed.keyMoments.map(String).slice(0, 6)
                    : [],
                practiceFocus: Array.isArray(parsed.practiceFocus)
                    ? parsed.practiceFocus.map(String).slice(0, 4)
                    : [],
            } satisfies FilmRoomResult);
        } catch (parseErr) {
            console.error("Film-room JSON parse failed:", parseErr);
            return NextResponse.json(fallbackFilm(transcript, summary, scores));
        }
    } catch (error: any) {
        console.error("Film-room error:", error);
        return NextResponse.json({ error: error.message || "Failed to build film room" }, { status: 500 });
    }
}
