import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";
import { computeDeterministicAts, validateAiAtsClaims, type DeterministicAtsResult } from "@/utils/atsEngine";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// In-memory cache for ATS matches keyed by resumeHash + jobId + jobDescriptionHash
const atsCache = new Map<string, { at: number; data: DeterministicAtsResult }>();

export async function POST(req: NextRequest) {
    let company = "";
    let role = "";
    let resumeText = "";
    let jobDescription = "";
    let jobId = "";

    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        resumeText = (body.resumeText || "").trim();
        company = (body.company || "").trim();
        role = (body.role || "").trim();
        jobId = (body.jobId || "").trim();

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

        // If job description is minimal, preserve role and company without injecting bias
        if (!jobDescription || jobDescription.length < 15) {
            jobDescription = `Position: ${role || "Candidate Position"} at ${company || "Target Company"}. Evaluate candidate background, core domain competencies, professional accomplishments, and qualifications.`;
        }

        // Step 1: Compute deterministic evidence-based ATS result (zero hallucination, strict factual baseline)
        const deterministicResult = computeDeterministicAts(resumeText, jobDescription, company, role);

        // Step 2: Check Job-specific ATS cache based on resumeHash + jobId/role + jobDescriptionHash
        const cacheKey = promptCacheKey("ats-v3", resumeText, jobId || role || company, jobDescription);
        const cached = atsCache.get(cacheKey);
        if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
            return NextResponse.json(cached.data);
        }

        // Rate limiting check
        const rl = rateLimit(`ats:${session.identifier}`, { limit: 25, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            console.log("[ATS Match API] Rate limited. Returning verified deterministic result.");
            return NextResponse.json(deterministicResult);
        }

        // Step 3: AI Explanation & Semantic Analysis with Gemini
        const prompt = `You are a rigorous, highly objective Applicant Tracking System (ATS) evaluator.
Your job is to evaluate how accurately, truthfully, and completely the candidate's resume satisfies the provided Job Description.

TARGET INDUSTRY / PROFESSION: Detect the profession directly from the Job Description (can be Healthcare, Finance, Marketing, Law, Engineering, Design, Operations, Sales, Education, etc.). Do NOT assume software engineering unless the job description specifically asks for it.

OBJECTIVE SCORING RULES:
1. NO SCORE INFLATION:
   - If the candidate's background is mostly unrelated to the Job Description, give an honest low score (e.g., 10% - 40%).
   - If the candidate satisfies most key requirements with relevant experience, give a moderate score (50% - 74%).
   - If the candidate strongly satisfies all required skills, experience level, and qualifications, give an interview-ready score (75% - 95%).
2. 4-PILLAR WEIGHTED EVALUATION:
   - Core Domain Skills (35% weight): Compare hard requirements, competencies, domain knowledge, and specialized tools asked in the JD vs found in the resume.
   - Experience & Seniority Scope (25% weight): Compare past job titles, years in field, and leadership/ownership scope.
   - Deliverables & Methodologies (15% weight): Compare day-to-day duties, accomplishments, tools, and quantifiable metrics.
   - Education & Credentials (15% weight): Compare required degrees, licenses, or professional certifications.
3. GROUNDING REQUIREMENTS (CRITICAL):
   - "keywordHits": ONLY include skills/terms that appear in BOTH the Job Description and the Resume.
   - "keywordGaps": ONLY include key skills/requirements explicitly stated in the Job Description that are MISSING from the Resume.
   - Do NOT invent or hallucinate keywords that were never in the Job Description.
   - Do NOT claim a skill or degree is matched if it is absent from the candidate's resume.
4. THRESHOLD:
   - Set "readyForMock": true ONLY if "matchPercent" >= 75. Otherwise false.

Company: ${company || "Not specified"}
Role: ${role || "Not specified"}

JOB DESCRIPTION:
${String(jobDescription).slice(0, 8000)}

CANDIDATE RESUME:
${String(resumeText).slice(0, 8000)}

Respond ONLY with valid JSON matching this schema:
{
  "matchPercent": <number between 0 and 100>,
  "readyForMock": <true if matchPercent >= 75, else false>,
  "summaryVerdict": "<1-2 sentence unbiased executive summary of candidate fit>",
  "breakdown": {
    "skillsMatch": <number between 0 and 100>,
    "experienceMatch": <number between 0 and 100>,
    "toolsMatch": <number between 0 and 100>,
    "educationMatch": <number between 0 and 100>
  },
  "keywordHits": ["<exact keyword from both JD and resume>"],
  "keywordGaps": ["<exact required keyword from JD missing from resume>"],
  "sectionAdvice": [
    "<actionable suggestion 1 tailored to this role>",
    "<actionable suggestion 2 tailored to this role>",
    "<actionable suggestion 3 tailored to this role>"
  ],
  "rewrittenBullets": [
    "<impactful bullet rewritten using candidate's actual experience tailored to this JD>",
    "<impactful bullet rewritten using candidate's actual experience tailored to this JD>"
  ]
}`;

        try {
            const raw = await generateWithFallback(prompt, {
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                },
                timeout: 25000
            });

            const parsed = parseJsonFromModel(raw) as Record<string, unknown>;
            
            // Step 4: Programmatic AI Validation Layer
            // Validates all AI claims against deterministic facts (rejecting unsupported skill hits or inflated scores)
            const validatedResult = validateAiAtsClaims(parsed, deterministicResult, resumeText, jobDescription);

            atsCache.set(cacheKey, { at: Date.now(), data: validatedResult });
            if (atsCache.size > 200) {
                const oldest = atsCache.keys().next().value;
                if (oldest) atsCache.delete(oldest);
            }
            return NextResponse.json(validatedResult);
        } catch (geminiErr) {
            console.warn("[ATS Match API] Gemini generation failed, activating deterministic engine fallback:", geminiErr);
            atsCache.set(cacheKey, { at: Date.now(), data: deterministicResult });
            return NextResponse.json(deterministicResult);
        }
    } catch (error: unknown) {
        console.error("[ATS Match API] Server error:", error);
        const fallback = computeDeterministicAts(resumeText, jobDescription, company, role);
        return NextResponse.json(fallback);
    }
}
