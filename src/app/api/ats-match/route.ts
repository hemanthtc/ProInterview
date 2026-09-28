import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        resumeText = (body.resumeText || "").trim();
        company = (body.company || "").trim();
        role = (body.role || "").trim();

        // Sanitize job description: strip raw HTML tags, unescape, normalize whitespace
        const rawJd = (body.jobDescription || "").trim();
        jobDescription = rawJd
            .replace(/<[^>]*>?/gm, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/\s+/g, " ")
            .trim();

        if (!resumeText) {
            return NextResponse.json({ error: "Please provide your resume text to compute ATS match." }, { status: 400 });
        }

        // If job description is minimal or empty (common from job aggregators), synthesize key context
        if (!jobDescription || jobDescription.length < 20) {
            jobDescription = `Position: ${role || "Software Engineer"} at ${company || "Technology Company"}. Key Responsibilities: Designing, developing, and maintaining high-quality software applications. Required Skills: Frontend & Backend development, problem solving, teamwork, system design, and communication.`;
        }

        const rl = rateLimit(`ats:${session.identifier}`, { limit: 20, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            console.log("[ATS Match API] Rate limited. Returning intelligent fallback.");
            return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
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

        try {
            const raw = await cachedGenerate(promptCacheKey("ats", company, role, resumeText, jobDescription), prompt);
            const parsed = parseJsonFromModel(raw) as any;
            if (parsed && typeof parsed.matchPercent === "number") {
                return NextResponse.json(parsed);
            }
            return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
        } catch (geminiErr) {
            console.warn("[ATS Match API] Gemini generation failed, activating intelligent heuristic engine:", geminiErr);
            return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
        }
    } catch (error: unknown) {
        console.error("[ATS Match API] Server error:", error);
        return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
    }
}
