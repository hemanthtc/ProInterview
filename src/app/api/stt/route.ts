import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";

/** Transcribe a short spoken answer via Gemini when browser speech recognition fails. */
export async function POST(req: NextRequest) {
    const session = await getVerifiedSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`stt:${session.identifier}`, { limit: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const audio = typeof body.audio === "string" ? body.audio : "";
    if (!audio.startsWith("data:audio/") || audio.length > 2_000_000) {
        return NextResponse.json({ error: "Short audio data URL required." }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "dummy") {
        return NextResponse.json({ text: "", provider: "offline" });
    }

    const comma = audio.indexOf(",");
    const base64 = comma >= 0 ? audio.slice(comma + 1) : audio;
    const mime = audio.slice(5, audio.indexOf(";")) || "audio/webm";
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    const result = await model.generateContent([
        { text: "Transcribe this interview answer. Return only the spoken words, no commentary." },
        { inlineData: { mimeType: mime, data: base64 } },
    ]);
    return NextResponse.json({ text: result.response.text().trim(), provider: "gemini" });
}
