import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { ANTI_LEAK_SUFFIX } from "@/utils/promptGuard";
import { polishEnglishOffline } from "@/utils/englishFluency";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").slice(0, 4000);
    if (text.trim().length < 8) {
        return NextResponse.json({ error: "Say or type at least a short sentence." }, { status: 400 });
    }

    const session = await getVerifiedSession();
    const bucket = session?.identifier || req.headers.get("x-forwarded-for") || "anon";
    const rl = rateLimit(`english:${bucket}`, { limit: 20, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
        return NextResponse.json({ error: `Rate limited. Retry in ${rl.retryAfterSec}s.` }, { status: 429 });
    }

    const offline = polishEnglishOffline(text);
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "dummy") {
        return NextResponse.json({ ...offline, provider: "offline" });
    }

    try {
        const raw = await cachedGenerate(
            promptCacheKey("english", text),
            `You coach Indian campus students on interview English (clarity, not accent).
Rewrite the spoken or written answer into professional interview English. Keep the same meaning. Do not invent achievements.

Student text:
${text}

Return JSON:
{
  "polished": "improved spoken answer",
  "tips": ["short tip", "short tip"],
  "applied": ["change you made"]
}
${ANTI_LEAK_SUFFIX}`
        );
        const parsed = parseJsonFromModel(raw) as {
            polished?: string;
            tips?: string[];
            applied?: string[];
        };
        return NextResponse.json({
            polished: parsed.polished || offline.polished,
            tips: Array.isArray(parsed.tips) && parsed.tips.length ? parsed.tips.slice(0, 5) : offline.tips,
            applied: Array.isArray(parsed.applied) ? parsed.applied.slice(0, 8) : offline.applied,
            provider: "gemini",
        });
    } catch {
        return NextResponse.json({ ...offline, provider: "offline" });
    }
}
