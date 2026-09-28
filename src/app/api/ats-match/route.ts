import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// In-memory cache for ATS matches to avoid duplicate Gemini calls
const atsCache = new Map<string, { at: number; data: any }>();

/**
 * Universal, domain-agnostic ATS heuristic engine.
 * Dynamically extracts requirements directly from ANY job description
 * (Healthcare, Finance, Marketing, Law, Engineering, Design, etc.)
 * and compares them against the resume without hardcoded profession bias.
 */
function generateAtsFallback(company: string, role: string, resumeText: string, jobDescription: string) {
    const rLower = (resumeText || "").toLowerCase();
    const jLower = (jobDescription || "").toLowerCase();

    // Standard English stop words to filter out non-qualifying generic words
    const STOP_WORDS = new Set([
        "about", "above", "after", "again", "against", "all", "also", "and", "any", "are", "aren't",
        "because", "been", "before", "being", "below", "between", "both", "but", "can", "cannot",
        "could", "did", "does", "doing", "don't", "down", "during", "each", "few", "for", "from",
        "further", "had", "has", "have", "having", "her", "here", "hers", "herself", "him", "himself",
        "his", "how", "into", "its", "itself", "just", "more", "most", "must", "myself", "nor",
        "not", "off", "once", "only", "other", "ought", "our", "ours", "ourselves", "out", "over",
        "own", "same", "she", "should", "some", "such", "than", "that", "the", "their", "theirs",
        "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "too",
        "under", "until", "very", "was", "wasn't", "were", "weren't", "what", "when", "where", "which",
        "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself",
        "looking", "candidate", "role", "position", "company", "requirements", "responsibilities",
        "qualifications", "experience", "years", "preferred", "minimum", "ability", "skills", "work",
        "team", "opportunity", "apply", "job", "description", "must", "have", "plus", "including"
    ]);

    // 1. Extract significant multi-word phrases and capitalized domain tokens from JD
    const phraseMatches = jobDescription.match(/\b[A-Z][a-zA-Z0-9+#.-]+(?:\s+[A-Z][a-zA-Z0-9+#.-]+)+\b/g) || [];
    
    // 2. Extract single key technical/professional tokens (length >= 3, non-stopwords)
    const tokenMatches = (jobDescription.match(/\b[a-zA-Z0-9+#.-]{3,30}\b/g) || [])
        .map(t => t.toLowerCase())
        .filter(t => !STOP_WORDS.has(t) && !/^\d+$/.test(t));

    // Combine unique candidate requirements extracted directly from the actual JD
    const uniqueJdKeywords: string[] = Array.from(new Set([
        ...phraseMatches.map(p => p.trim()),
        ...tokenMatches
    ])).filter(k => k.length >= 3);

    const hits: string[] = [];
    const gaps: string[] = [];

    for (const kw of uniqueJdKeywords) {
        const kwLower = kw.toLowerCase();
        // Regex word boundary matching
        const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");

        if (regex.test(rLower)) {
            hits.push(kw);
        } else {
            gaps.push(kw);
        }
    }

    const totalKeyReqs = hits.length + gaps.length;
    // Unbiased mathematical score calculation (no artificial 55% or 75% floor)
    let matchPercent = 0;
    if (totalKeyReqs > 0) {
        matchPercent = Math.min(100, Math.max(0, Math.round((hits.length / totalKeyReqs) * 100)));
    } else {
        // Fallback when JD is extremely brief: check role title alignment
        matchPercent = role && rLower.includes(role.toLowerCase()) ? 70 : 40;
    }

    const readyForMock = matchPercent >= 75;

    return {
        matchPercent,
        readyForMock,
        summaryVerdict: matchPercent >= 75
            ? `Strong match (${matchPercent}%). Your credentials align closely with the key requirements for ${role || "this role"}.`
            : `Moderate to low match (${matchPercent}%). Several critical requirements specified in the job description are missing from your resume.`,
        breakdown: {
            skillsMatch: matchPercent,
            experienceMatch: Math.min(100, Math.max(0, matchPercent + (matchPercent > 50 ? 5 : -10))),
            toolsMatch: matchPercent,
            educationMatch: Math.min(100, Math.max(20, matchPercent + 10))
        },
        keywordHits: hits.slice(0, 15),
        keywordGaps: gaps.slice(0, 15),
        sectionAdvice: [
            `Incorporate missing requirements from the job description (${gaps.slice(0, 3).join(", ") || "core domain competencies"}) into your professional summary and experience sections.`,
            `Highlight specific quantifiable accomplishments, project metrics, and results that directly demonstrate the responsibilities listed by ${company || "the hiring team"}.`,
            `Ensure all domain-specific certifications, tools, and methodologies asked for are explicitly stated under your Skills or Education sections.`
        ],
        rewrittenBullets: [
            `Demonstrated proficiency in ${hits[0] || "core competencies"}, delivering high-impact outcomes aligned with ${company || "enterprise"} standards.`,
            `Applied expertise in ${hits[1] || "key industry workflows"} to streamline operational efficiency and cross-functional collaboration.`,
            `Managed end-to-end deliverables while adhering to industry best practices and quality benchmarks.`
        ],
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

        // If job description is minimal, preserve the user's role and company without injecting software bias
        if (!jobDescription || jobDescription.length < 15) {
            jobDescription = `Position: ${role || "Candidate Position"} at ${company || "Target Company"}. Evaluate candidate background, core domain competencies, professional accomplishments, and qualifications.`;
        }

        const rl = rateLimit(`ats:${session.identifier}`, { limit: 25, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            console.log("[ATS Match API] Rate limited. Returning intelligent domain-agnostic fallback.");
            return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
        }

        const cacheKey = promptCacheKey("ats-v2", company, role, resumeText, jobDescription);
        const cached = atsCache.get(cacheKey);
        if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
            return NextResponse.json(cached.data);
        }

        const prompt = `You are a rigorous, highly objective Applicant Tracking System (ATS) and professional recruiter.
Your job is to evaluate how accurately, truthfully, and completely the candidate's resume satisfies the provided Job Description.

TARGET INDUSTRY / PROFESSION: Detect the profession directly from the Job Description (can be Healthcare, Finance, Marketing, Law, Engineering, Design, Operations, Sales, Education, etc.). Do NOT assume software engineering unless the job description specifically asks for it.

CRITICAL UNBIASED & OBJECTIVE SCORING RULES:
1. NO SCORE INFLATION OR ARTIFICIAL FLOORS: Do NOT default to 75-80%.
   - If the candidate's background is mostly unrelated to the Job Description, give an honest low score (e.g., 10% - 40%).
   - If the candidate satisfies most key requirements with relevant experience, give a moderate score (50% - 74%).
   - If the candidate strongly satisfies all required skills, experience level, and qualifications, give an interview-ready score (75% - 95%).
2. 4-PILLAR WEIGHTED EVALUATION:
   - Core Domain Skills (40% weight): Compare hard requirements, competencies, domain knowledge, and specialized tools asked in the JD vs found in the resume.
   - Experience & Seniority Scope (25% weight): Compare past job titles, years in field, and leadership/ownership scope.
   - Deliverables & Methodologies (20% weight): Compare day-to-day duties, accomplishments, tools, and quantifiable metrics.
   - Education & Credentials (15% weight): Compare required degrees, licenses, or professional certifications.
3. GROUNDING REQUIREMENTS:
   - "keywordHits": ONLY include skills/terms that appear in BOTH the Job Description and the Resume.
   - "keywordGaps": ONLY include key skills/requirements explicitly stated in the Job Description that are MISSING from the Resume.
   - Do NOT invent or hallucinate keywords that were never in the Job Description.
4. THRESHOLD:
   - Set "readyForMock": true ONLY if "matchPercent" >= 75. Otherwise false.

Company: ${company || "Not specified"}
Role: ${role || "Not specified"}

JOB DESCRIPTION:
${String(jobDescription).slice(0, 7000)}

CANDIDATE RESUME:
${String(resumeText).slice(0, 7000)}

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

            const parsed = parseJsonFromModel(raw) as any;
            if (parsed && typeof parsed.matchPercent === "number") {
                // Enforce exact mathematical boundary and readyForMock threshold
                parsed.matchPercent = Math.min(100, Math.max(0, Math.round(parsed.matchPercent)));
                parsed.readyForMock = parsed.matchPercent >= 75;
                if (!parsed.breakdown) {
                    parsed.breakdown = {
                        skillsMatch: parsed.matchPercent,
                        experienceMatch: parsed.matchPercent,
                        toolsMatch: parsed.matchPercent,
                        educationMatch: parsed.matchPercent
                    };
                }
                atsCache.set(cacheKey, { at: Date.now(), data: parsed });
                if (atsCache.size > 200) {
                    const oldest = atsCache.keys().next().value;
                    if (oldest) atsCache.delete(oldest);
                }
                return NextResponse.json(parsed);
            }
            return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
        } catch (geminiErr) {
            console.warn("[ATS Match API] Gemini generation failed, activating intelligent domain-agnostic heuristic engine:", geminiErr);
            return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
        }
    } catch (error: unknown) {
        console.error("[ATS Match API] Server error:", error);
        return NextResponse.json(generateAtsFallback(company, role, resumeText, jobDescription));
    }
}
