import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";
import {
    normalizeGeneratedStarQuestions,
    shuffleStarQuestions,
    STAR_CATEGORY_LABELS,
    STAR_SEED_QUESTIONS,
    type StarQuestionCategory,
} from "@/data/starCoachQuestions";

const VALID_CATEGORIES = new Set(Object.keys(STAR_CATEGORY_LABELS));

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const count = Math.min(5, Math.max(1, Number(searchParams.get("count") || 1) || 1));
    const categoryParam = searchParams.get("category") || undefined;
    const category =
        categoryParam && VALID_CATEGORIES.has(categoryParam)
            ? (categoryParam as StarQuestionCategory)
            : undefined;

    return NextResponse.json({
        questions: shuffleStarQuestions(STAR_SEED_QUESTIONS, count, category),
        source: "seed",
    });
}

/** Generate behavioral STAR practice questions online (seed fallback if unavailable). */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const count = Math.min(5, Math.max(1, Number(body?.count) || 1));
        const categoryRaw = typeof body?.category === "string" ? body.category.toLowerCase() : "mixed";
        const category = VALID_CATEGORIES.has(categoryRaw)
            ? (categoryRaw as StarQuestionCategory)
            : "mixed";
        const company = typeof body?.company === "string" ? body.company.slice(0, 120) : "";
        const role = typeof body?.role === "string" ? body.role.slice(0, 120) : "";
        const exclude = Array.isArray(body?.exclude) ? body.exclude.map(String).slice(0, 20) : [];

        const rl = rateLimit(`star-q:${session.identifier}`, { limit: 40, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const categoryLabel = STAR_CATEGORY_LABELS[category];

        const onlinePrompt = `You are an expert behavioral interview coach creating STAR practice questions.
Generate exactly ${count} unique behavioral interview question(s).
Category: ${categoryLabel}
Target company style: ${company || "corporate standard"}
Target role: ${role || "Candidate Target Role"}
Do NOT repeat: ${exclude.join(" | ") || "(none)"}
Randomization nonce: ${nonce}

Questions must be answerable with STAR (Situation, Task, Action, Result).
Vary difficulty and scenarios (intern to senior). Be realistic for FAANG-style loops when company is known.

Return JSON only:
{
  "questions": [
    {
      "id": "unique-slug",
      "question": "Tell me about a time...",
      "category": "${category === "mixed" ? "conflict|leadership|failure|teamwork|deadline|influence|customer|mixed" : category}",
      "focus": "what the interviewer probes",
      "suggestedWeakSpot": "common mistake to avoid in the answer",
      "hint": "optional one-line coaching tip"
    }
  ]
}`;

        try {
            const raw = await cachedGenerate(
                promptCacheKey("star-q", count, category, company, role, nonce),
                onlinePrompt,
                60 * 1000
            );
            const parsed = parseJsonFromModel(raw);
            const questions = normalizeGeneratedStarQuestions(parsed, count).slice(0, count);
            return NextResponse.json({ questions, source: "online" });
        } catch (onlineErr) {
            console.warn("star-coach-questions online fetch failed, using seed", onlineErr);
            return NextResponse.json({
                questions: shuffleStarQuestions(STAR_SEED_QUESTIONS, count, category),
                source: "seed",
                warning: "Online generator unavailable; served shuffled seed questions.",
            });
        }
    } catch (error: unknown) {
        console.error("star-coach-questions", error);
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
