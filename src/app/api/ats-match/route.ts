import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

function generateAtsFallback(company: string, role: string, resumeText: string, jobDescription: string) {
    const rLower = (resumeText || "").toLowerCase();
    const jLower = (jobDescription || "").toLowerCase();

    const commonSkills = [
        "react", "typescript", "javascript", "node.js", "node", "next.js", "python", "java", "c++",
        "html", "css", "tailwind", "sql", "postgresql", "mongodb", "aws", "docker", "kubernetes",
        "git", "ci/cd", "rest api", "graphql", "agile", "scrum", "microservices", "unit testing",
        "system design", "data structures", "algorithms", "communication", "leadership", "problem solving"
    ];

    const hits: string[] = [];
    const gaps: string[] = [];

    for (const skill of commonSkills) {
        const inJd = jLower.includes(skill);
        const inResume = rLower.includes(skill);
        if (inJd && inResume) {
            hits.push(skill.toUpperCase());
        } else if (inJd && !inResume) {
            gaps.push(skill.toUpperCase());
        }
    }

    const totalJdSkills = hits.length + gaps.length;
    let matchPercent = 75;
    if (totalJdSkills > 0) {
        matchPercent = Math.min(92, Math.max(55, Math.round((hits.length / totalJdSkills) * 100)));
    }

    return {
        matchPercent,
        keywordHits: hits.length > 0 ? hits : ["TECHNICAL ALIGNMENT", "PROBLEM SOLVING", "SOFTWARE ARCHITECTURE"],
        keywordGaps: gaps.length > 0 ? gaps : ["CLOUD INFRASTRUCTURE", "AUTOMATED E2E TESTING"],
        sectionAdvice: [
            `Add explicit references to key requirements from the ${company || "Target"} ${role || "Position"} description into your summary section.`,
            "Include quantifiable metrics (e.g. '% improvement', 'X users served') in your recent experience bullet points.",
            "Group technical skills into clear subheadings (e.g., Languages, Frameworks, Cloud & DevOps) to improve ATS parser readability."
        ],
        rewrittenBullets: [
            `Architected end-to-end solutions for ${role || "engineering team"}, improving core module processing speed by 35%.`,
            `Collaborated cross-functionally to deliver feature workflows aligned with ${company || "enterprise"} standards.`,
            "Refactored legacy codebases to adopt modern TypeScript and testing patterns, reducing runtime bug frequency by 40%."
        ],
        readyForMock: true,
        isFallback: true
    };
}

export async function POST(req: NextRequest) {
    let company = "";
    let role = "";
    let resumeText = "";
    let jobDescription = "";

    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        resumeText = body.resumeText || "";
        jobDescription = body.jobDescription || "";
        company = body.company || "";
        role = body.role || "";

        if (!resumeText || !jobDescription) {
            return NextResponse.json({ error: "resumeText and jobDescription are required" }, { status: 400 });
        }
        const rl = rateLimit(`ats:${session.identifier}`, { limit: 15, windowMs: 15 * 60 * 1000 });
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

        const raw = await cachedGenerate(promptCacheKey("ats", company, role, resumeText, jobDescription), prompt);
        return NextResponse.json(parseJsonFromModel(raw));
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message.includes("rate limit") || message.includes("quota") || message.includes("429") || message.includes("fallback mode")) {
            console.log("[ATS Match API] Activating intelligent fallback mode due to Gemini rate limit.");
            return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
