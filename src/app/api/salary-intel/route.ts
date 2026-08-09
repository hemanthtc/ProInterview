import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { company, role, location, level, currentOffer } = await req.json();
        const rl = rateLimit(`salary:${session.identifier}`, { limit: 20, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const prompt = `Provide realistic compensation intelligence for negotiation prep (not financial advice).
Company: ${company || "tech company"}
Role: ${role || "Software Engineer"}
Location: ${location || "US remote / major metro"}
Level: ${level || "mid"}
Current offer (if any): ${currentOffer || "none"}

Return JSON:
{
  "currency": "USD",
  "baseRange": { "p25": 0, "p50": 0, "p75": 0 },
  "totalCompRange": { "p25": 0, "p50": 0, "p75": 0 },
  "equityNotes": "...",
  "signingBonusTypical": "...",
  "levers": ["base", "equity", "sign-on", "level"],
  "negotiationScript": "...",
  "confidence": "low|medium|high",
  "sourcesNote": "Model estimate based on public market patterns; verify with live data."
}`;

        const raw = await cachedGenerate(
            promptCacheKey("salary", company, role, location, level, currentOffer),
            prompt,
            30 * 60 * 1000
        );
        return NextResponse.json(parseJsonFromModel(raw));
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
