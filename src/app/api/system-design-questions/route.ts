import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";
import {
    normalizeGeneratedQuestions,
    shufflePickQuestions,
    SYSTEM_DESIGN_SEED_QUESTIONS,
    type SystemDesignDifficulty,
} from "@/data/systemDesignQuestions";

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const count = Math.min(12, Math.max(1, Number(searchParams.get("count") || 6) || 6));
    const difficultyParam = searchParams.get("difficulty") || undefined;
    const difficulty =
        difficultyParam && VALID_DIFFICULTIES.has(difficultyParam)
            ? (difficultyParam as SystemDesignDifficulty)
            : undefined;

    // Lightweight seed sample for unauthenticated browsing / SSR; interactive lab prefers POST (online).
    return NextResponse.json({
        questions: shufflePickQuestions(SYSTEM_DESIGN_SEED_QUESTIONS, count, difficulty),
        source: "seed",
    });
}

/** Fetch random system-design prompts online via Gemini (seed fallback only if online fails). */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const count = Math.min(12, Math.max(1, Number(body?.count) || 6));
        const difficultyRaw = typeof body?.difficulty === "string" ? body.difficulty.toLowerCase() : "";
        const difficulty = VALID_DIFFICULTIES.has(difficultyRaw)
            ? (difficultyRaw as SystemDesignDifficulty)
            : undefined;
        const focus = typeof body?.focus === "string" ? body.focus.slice(0, 200) : "";
        const exclude = Array.isArray(body?.exclude)
            ? body.exclude.map(String).slice(0, 40)
            : [];

        const rl = rateLimit(`sysdesign-q:${session.identifier}`, { limit: 30, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const onlinePrompt = `You are a staff engineer writing unique system-design interview prompts.
Generate exactly ${count} DISTINCT system design interview questions.
Difficulty filter: ${difficulty || "mixed (easy/medium/hard)"}
Optional focus theme: ${focus || "general distributed systems / product backends"}
Do NOT repeat any of these prompts or titles: ${exclude.join(" | ") || "(none)"}
Randomization nonce (vary topics): ${nonce}

Cover a diverse mix: storage, realtime, search, payments, media, geo, multi-tenant SaaS, streaming, etc.
Each question must be realistic for FAANG-style interviews.

Return JSON only:
{
  "questions": [
    {
      "id": "unique-slug",
      "title": "short name",
      "prompt": "Full design prompt starting with Design ...",
      "difficulty": "easy|medium|hard",
      "topics": ["topic1", "topic2"],
      "constraints": ["constraint1"],
      "focusAreas": ["what interviewers probe"]
    }
  ]
}`;

        try {
            const raw = await cachedGenerate(
                promptCacheKey("sysdesign-q", count, difficulty, focus, nonce),
                onlinePrompt,
                60 * 1000
            );
            const parsed = parseJsonFromModel(raw);
            const questions = normalizeGeneratedQuestions(parsed, count).slice(0, count);
            return NextResponse.json({ questions, source: "online" });
        } catch (onlineErr) {
            console.warn("system-design-questions online fetch failed, using seed", onlineErr);
            return NextResponse.json({
                questions: shufflePickQuestions(SYSTEM_DESIGN_SEED_QUESTIONS, count, difficulty),
                source: "seed",
                warning: "Online question generator unavailable; served shuffled seed bank.",
            });
        }
    } catch (error: unknown) {
        console.error("system-design-questions", error);
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
