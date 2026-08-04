import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";

export async function POST(req: NextRequest) {
    try {
        const { resumeText, jobDescription, company, role } = await req.json();
        if (!resumeText || !jobDescription) {
            return NextResponse.json({ error: "resumeText and jobDescription are required" }, { status: 400 });
        }
        const rl = rateLimit(`ats:${(company || role || "x").toString()}`, { limit: 15, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const prompt = `You are an ATS + recruiter hybrid. Score how well this resume matches the job description.
Company: ${company || "n/a"} Role: ${role || "n/a"}

RESUME:
${String(resumeText).slice(0, 8000)}

JOB DESCRIPTION:
${String(jobDescription).slice(0, 8000)}

Return JSON:
{
  "matchPercent": 0-100,
  "keywordHits": ["..."],
  "keywordGaps": ["..."],
  "sectionAdvice": ["..."],
  "rewrittenBullets": ["..."],
  "readyForMock": true
}`;

        const raw = await cachedGenerate(`ats:${company}:${role}:${jobDescription.slice(0, 80)}`, prompt);
        return NextResponse.json(parseJsonFromModel(raw));
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
