import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { checkAndIncrementUsage } from "@/utils/usageMeter";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { story, question, weakSpot, mode = "coach", company, role } = await req.json();
        const rl = rateLimit(`star:${session.identifier}`, { limit: 30, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        let userPlan = "Free Tier";
        try {
            await connectDB();
            const user = await User.findOne({ identifier: session.identifier }).select("subscriptionPlan").lean();
            userPlan = (user as { subscriptionPlan?: string } | null)?.subscriptionPlan || "Free Tier";
        } catch (planErr) {
            console.warn("star-coach: plan lookup skipped", planErr);
        }

        const usage = await checkAndIncrementUsage(session.identifier, "gemini", userPlan);
        if (!usage.allowed) {
            return NextResponse.json(
                { error: `Monthly AI coaching limit reached (${usage.limit}/month). Upgrade to Pro for more sessions.` },
                {
                    status: 429,
                    headers: usage.retryAfterSec ? { "Retry-After": String(usage.retryAfterSec) } : undefined,
                }
            );
        }

        const prompt = `You are a behavioral interview coach using the STAR method (Situation, Task, Action, Result).
Company: ${company || "tech company"} Role: ${role || "SWE"}
Target question: ${question || "Tell me about a time you handled conflict."}
Known weak spot from film room / prior feedback: ${weakSpot || "unclear impact metrics"}
Mode: ${mode} (coach = rewrite help, score = grade the story, retake = give a tighter follow-up question)

Candidate story:
${story || "(ask them to draft one)"}

Score based on STAR structure, personal ownership ("I" not only "we"), specificity, and measurable results.
For coach mode, rewrite the story into a tight 90–120 second spoken answer.

Return JSON:
{
  "starBreakdown": { "situation": "...", "task": "...", "action": "...", "result": "..." },
  "score": 0-100,
  "missing": ["..."],
  "improvedStory": "...",
  "retakePrompt": "...",
  "tips": ["..."]
}`;

        const raw = await cachedGenerate(
            promptCacheKey("star", mode, company, role, question, weakSpot, story),
            prompt
        );
        return NextResponse.json(parseJsonFromModel(raw));
    } catch (error: unknown) {
        console.error("star-coach", error);
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
