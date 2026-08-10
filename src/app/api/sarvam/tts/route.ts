import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import { sarvamTextToSpeech, getSarvamKey } from "@/utils/sarvam";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        if (!getSarvamKey()) {
            return NextResponse.json(
                { error: "SARVAM_API_KEY is not configured.", fallback: true },
                { status: 503 }
            );
        }

        const rl = rateLimit(`sarvam-tts:${session.identifier}`, { limit: 60, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const { text, voiceLanguage } = await req.json();
        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "text is required" }, { status: 400 });
        }

        const audio = await sarvamTextToSpeech(text, voiceLanguage);
        if (!audio) {
            return NextResponse.json({ error: "Sarvam TTS failed", fallback: true }, { status: 502 });
        }

        return NextResponse.json({
            audioBase64: audio.audioBase64,
            mimeType: audio.mimeType,
            source: "sarvam",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
