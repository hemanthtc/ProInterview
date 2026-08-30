import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import { ANTI_LEAK_SUFFIX } from "@/utils/promptGuard";

const EXPRESSIONS = ["neutral", "focused", "smiling", "frowning", "surprised", "looking_away", "no_face"] as const;

export type FaceExpression = (typeof EXPRESSIONS)[number];

function isExpression(value: string): value is FaceExpression {
    return (EXPRESSIONS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
    const session = await getVerifiedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
    }

    const rl = rateLimit(`proctor-expr:${session.identifier}`, { limit: 40, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
        return NextResponse.json(
            { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        );
    }

    const body = await req.json().catch(() => null);
    const image = typeof body?.image === "string" ? body.image : "";
    if (!image.startsWith("data:image/") || image.length > 400_000) {
        return NextResponse.json({ error: "A small webcam JPEG data URL is required." }, { status: 400 });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY || API_KEY === "dummy") {
        return NextResponse.json({
            expression: "neutral",
            faceVisible: true,
            attention: "unknown",
            source: "fallback",
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            generationConfig: { temperature: 0 },
        });
        const comma = image.indexOf(",");
        const base64 = comma >= 0 ? image.slice(comma + 1) : image;
        const mime = image.slice(5, image.indexOf(";")) || "image/jpeg";

        const result = await model.generateContent([
            {
                text: `You are a coding-assessment proctor. Classify the candidate webcam frame.
Return ONLY JSON: {"expression":"neutral|focused|smiling|frowning|surprised|looking_away|no_face","faceVisible":true|false,"attention":"on_screen|away|unknown"}
Rules: one person expected; looking_away if eyes/head are clearly off-camera; no_face if no face is visible.
${ANTI_LEAK_SUFFIX}`,
            },
            { inlineData: { mimeType: mime, data: base64 } },
        ]);

        const raw = result.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
        const parsed = JSON.parse(raw) as { expression?: string; faceVisible?: boolean; attention?: string };
        const expression = isExpression(String(parsed.expression || "")) ? parsed.expression : "neutral";
        return NextResponse.json({
            expression,
            faceVisible: Boolean(parsed.faceVisible) && expression !== "no_face",
            attention: parsed.attention === "away" || parsed.attention === "on_screen" ? parsed.attention : "unknown",
            source: "gemini",
        });
    } catch {
        return NextResponse.json({
            expression: "neutral",
            faceVisible: true,
            attention: "unknown",
            source: "fallback",
        });
    }
}
