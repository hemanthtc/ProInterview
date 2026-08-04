import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";

export async function POST(req: NextRequest) {
    try {
        const { prompt, sketchDescription, notes, company, role, level } = await req.json();
        const rl = rateLimit(`sysdesign:${(prompt || "").slice(0, 40)}`, { limit: 20, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const designPrompt = `You are a staff engineer evaluating a system-design interview answer.
Company: ${company || "generic"}
Role: ${role || "Software Engineer"}
Level: ${level || "intermediate"}
Prompt given to candidate: ${prompt || "Design a URL shortener"}

Candidate whiteboard notes / component list:
${notes || "(none)"}

Candidate sketch description (from canvas labels / summary):
${sketchDescription || "(none)"}

Score 0-100 for: requirements, capacity_estimation, api_design, data_model, scalability, tradeoffs, communication.
Also list missing pieces and a stronger outline.

Return JSON only:
{
  "overall": 0-100,
  "scores": {
    "requirements": 0-100,
    "capacity": 0-100,
    "api": 0-100,
    "dataModel": 0-100,
    "scalability": 0-100,
    "tradeoffs": 0-100,
    "communication": 0-100
  },
  "strengths": ["..."],
  "gaps": ["..."],
  "modelAnswerOutline": ["step1", "step2"],
  "followUpQuestions": ["..."]
}`;

        const raw = await cachedGenerate(`sysdesign:${prompt}:${notes}`.slice(0, 200), designPrompt);
        const parsed = parseJsonFromModel(raw);
        return NextResponse.json(parsed);
    } catch (error: unknown) {
        console.error("evaluate-system-design", error);
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
