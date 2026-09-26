import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import {
    extractResumeProfileHeuristic,
    buildSearchQueries,
    searchMatchingJobs,
    webSearchUrls,
    INDIA_FALLBACK_JOBS,
    type JobType,
    type MatchedJob,
    type ResumeProfile,
} from "@/utils/jobSearch";
import { DOMAIN_FALLBACK_JOBS, type FallbackJob } from "@/utils/domainFallbackJobs";

export interface JobListing {
    id: string;
    company: string;
    role: string;
    location: string;
    type: JobType;
    remote: boolean;
    tags: string[];
    salaryRange?: string;
    description: string;
    applyUrl?: string;
    postedAt: string;
}

const FALLBACK_JOBS: JobListing[] = [
    {
        id: "job_stripe_be",
        company: "Stripe",
        role: "Backend Engineer",
        location: "Remote / SF",
        type: "full-time",
        remote: true,
        tags: ["API", "Payments", "Ruby/Go"],
        salaryRange: "$170k–$240k",
        description: "Build reliable payment infrastructure used by millions of businesses.",
        applyUrl: "https://stripe.com/jobs",
        postedAt: "2026-07-20",
    },
    {
        id: "job_meta_fe",
        company: "Meta",
        role: "Frontend Engineer",
        location: "Menlo Park, CA",
        type: "full-time",
        remote: false,
        tags: ["React", "Performance", "Product"],
        salaryRange: "$160k–$230k",
        description: "Ship product surfaces used by billions with a focus on performance and accessibility.",
        applyUrl: "https://www.metacareers.com/",
        postedAt: "2026-07-18",
    },
    {
        id: "job_google_ml",
        company: "Google",
        role: "ML Engineer",
        location: "Bangalore / Hybrid",
        type: "full-time",
        remote: false,
        tags: ["ML", "Python", "Serving"],
        salaryRange: "₹35L–₹65L",
        description: "Productionize ranking and recommendation models with strong evaluation discipline.",
        applyUrl: "https://careers.google.com/",
        postedAt: "2026-07-22",
    },
    {
        id: "job_amazon_sde_intern",
        company: "Amazon",
        role: "SDE Intern",
        location: "Hyderabad",
        type: "intern",
        remote: false,
        tags: ["Java", "DSA", "Leadership Principles"],
        salaryRange: "Stipend competitive",
        description: "Work on large-scale distributed systems with mentorship from senior engineers.",
        applyUrl: "https://www.amazon.jobs/",
        postedAt: "2026-07-15",
    },
    {
        id: "job_notion_full",
        company: "Notion",
        role: "Full-Stack Engineer",
        location: "Remote",
        type: "full-time",
        remote: true,
        tags: ["TypeScript", "Postgres", "Product"],
        salaryRange: "$150k–$220k",
        description: "Own features end-to-end across collaborative editor infrastructure.",
        applyUrl: "https://www.notion.so/careers",
        postedAt: "2026-07-25",
    },
];

/** Static fallback + curated India (Bangalore/Hyderabad-focused) listings combined. */
const ALL_FALLBACK_JOBS: (JobListing & { source?: string })[] = [...FALLBACK_JOBS, ...INDIA_FALLBACK_JOBS];

function filterStatic(q: string, tag: string): JobListing[] {
    let list: JobListing[] = ALL_FALLBACK_JOBS;
    if (q) {
        list = list.filter(
            (j) =>
                j.company.toLowerCase().includes(q) ||
                j.role.toLowerCase().includes(q) ||
                j.location.toLowerCase().includes(q)
        );
    }
    if (tag) {
        list = list.filter((j) => j.tags.some((t) => t.toLowerCase().includes(tag)));
    }
    return list;
}

/** Get curated fallback jobs appropriate for the candidate's career domain. Never return software jobs for other domains. */
function getFallbackJobsForDomain(careerDomain: string): FallbackJob[] {
    if (DOMAIN_FALLBACK_JOBS[careerDomain]) {
        return DOMAIN_FALLBACK_JOBS[careerDomain];
    }
    const domLower = careerDomain.toLowerCase();
    for (const [key, list] of Object.entries(DOMAIN_FALLBACK_JOBS)) {
        if (domLower.includes(key.toLowerCase()) || key.toLowerCase().includes(domLower)) {
            return list;
        }
    }
    // Only return tech fallbacks if candidate domain is genuinely tech
    if (/software|it|developer|programming|web|computer/i.test(domLower)) {
        return ALL_FALLBACK_JOBS;
    }
    return DOMAIN_FALLBACK_JOBS["General / Multidisciplinary"] || [];
}

async function enrichProfileWithGemini(resumeText: string, heuristic: ResumeProfile, targetDomain?: string): Promise<ResumeProfile> {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "dummy" || key.includes("your_gemini")) {
        return heuristic;
    }

    try {
        const userDomainGuidance = targetDomain
            ? `\nIMPORTANT: The candidate explicitly specified their target job domain/field as: "${targetDomain}". Prioritize roles, functions, and keywords within "${targetDomain}" while extracting matching projects, skills, and educational qualifications from the resume.`
            : ``;

        const prompt = `You are an expert career profiler across ALL professional disciplines (Mechanical, Civil, Electrical, Electronics, Finance, Accounting, HR, Marketing, Sales, Operations, Healthcare, Education, Design, Software/IT, Legal, etc.).
Extract a domain-neutral job-search profile from this resume. Inferred domain must reflect candidate's actual qualifications, projects, and experience. Do NOT assume Software/IT unless explicit computer science or software engineering evidence exists.${userDomainGuidance}
Return JSON only:
{
  "careerDomain": "primary career domain (e.g. Mechanical Engineering, Civil Engineering, Finance & Accounting, Human Resources, Marketing, Healthcare, Education, Software & IT, etc.)",
  "subDomain": "specialization or sub-domain if applicable",
  "roles": ["primary target job titles based on actual domain, max 4"],
  "relatedRoles": ["adjacent or complementary job titles in the same or related domain, max 4"],
  "skills": ["domain-specific skills and capabilities, max 15"],
  "softSkills": ["key soft skills, max 5"],
  "industries": ["relevant industry sectors, max 3"],
  "jobFunctions": ["key job functions, max 4"],
  "education": ["degrees and major fields of study, max 3"],
  "seniority": "intern|entry|junior|mid|senior|lead|unknown",
  "yearsOfExperience": 0,
  "certifications": ["relevant certifications, max 4"],
  "toolsAndTechnologies": ["domain tools, equipment, software, platforms, max 10"],
  "keywords": ["searchable keywords, max 12"],
  "summary": "one concise sentence summarizing professional career profile"
}

RESUME:
${resumeText.slice(0, 9000)}`;

        const raw = await cachedGenerate(promptCacheKey("job-profile", resumeText.slice(0, 2000)), prompt);
        const parsed = parseJsonFromModel(raw) as Partial<ResumeProfile>;
        
        // Guard against AI erroneously returning Software Engineer if heuristic clearly identified non-software
        let finalDomain = (typeof parsed.careerDomain === "string" && parsed.careerDomain.trim())
            ? parsed.careerDomain.trim()
            : heuristic.careerDomain;
            
        let finalRoles = Array.isArray(parsed.roles) && parsed.roles.length
            ? parsed.roles.map(String).slice(0, 5)
            : heuristic.roles;

        // If candidate specified target domain or heuristic detected non-software, enforce domain alignment
        if (targetDomain) {
            finalDomain = heuristic.careerDomain;
            if (!finalRoles.length) finalRoles = heuristic.roles;
        } else {
            const heuristicIsNonTech = !/software|it|computer|web|programming/i.test(heuristic.careerDomain);
            if (heuristicIsNonTech && /software|it|computer|sde/i.test(finalDomain)) {
                finalDomain = heuristic.careerDomain;
                finalRoles = heuristic.roles;
            }
        }

        return {
            careerDomain: finalDomain,
            subDomain: typeof parsed.subDomain === "string" ? parsed.subDomain : heuristic.subDomain,
            roles: finalRoles,
            relatedRoles: Array.isArray(parsed.relatedRoles) && parsed.relatedRoles.length
                ? parsed.relatedRoles.map(String).slice(0, 5)
                : heuristic.relatedRoles,
            skills: Array.isArray(parsed.skills) && parsed.skills.length
                ? parsed.skills.map(String).slice(0, 15)
                : heuristic.skills,
            softSkills: Array.isArray(parsed.softSkills) ? parsed.softSkills.map(String).slice(0, 5) : heuristic.softSkills,
            industries: Array.isArray(parsed.industries) ? parsed.industries.map(String).slice(0, 3) : heuristic.industries,
            jobFunctions: Array.isArray(parsed.jobFunctions) ? parsed.jobFunctions.map(String).slice(0, 4) : heuristic.jobFunctions,
            education: Array.isArray(parsed.education) ? parsed.education.map(String).slice(0, 3) : heuristic.education,
            seniority: typeof parsed.seniority === "string" ? parsed.seniority : heuristic.seniority,
            yearsOfExperience: typeof parsed.yearsOfExperience === "number" ? parsed.yearsOfExperience : heuristic.yearsOfExperience,
            certifications: Array.isArray(parsed.certifications) ? parsed.certifications.map(String).slice(0, 4) : heuristic.certifications,
            toolsAndTechnologies: Array.isArray(parsed.toolsAndTechnologies) ? parsed.toolsAndTechnologies.map(String).slice(0, 10) : heuristic.toolsAndTechnologies,
            keywords: Array.isArray(parsed.keywords) && parsed.keywords.length
                ? parsed.keywords.map(String).slice(0, 20)
                : heuristic.keywords,
            summary: typeof parsed.summary === "string" ? parsed.summary : heuristic.summary,
            confidence: parsed.careerDomain ? 0.95 : heuristic.confidence,
        };
    } catch {
        return heuristic;
    }
}

function scoreFallbackJobs(profile: ResumeProfile, location: string, filter?: string): MatchedJob[] {
    const candidateFallbacks = getFallbackJobsForDomain(profile.careerDomain);

    return candidateFallbacks.map((job) => {
        const hay = `${job.role} ${job.company} ${job.location} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
        let score = 8;
        const reasons: string[] = ["Curated verified opening"];

        for (const role of profile.roles) {
            if (hay.includes(role.toLowerCase()) || role.toLowerCase().split(/\s+/).some((p) => p.length > 3 && hay.includes(p))) {
                score += 22;
                reasons.push(`Role overlap: ${role}`);
                break;
            }
        }

        if (profile.relatedRoles) {
            for (const rel of profile.relatedRoles) {
                if (hay.includes(rel.toLowerCase())) {
                    score += 15;
                    reasons.push(`Related role: ${rel}`);
                    break;
                }
            }
        }

        const allSkills = [...(profile.skills || []), ...(profile.toolsAndTechnologies || [])];
        const skillHits = allSkills.filter((s) => s.length > 2 && hay.includes(s.toLowerCase()));
        if (skillHits.length) {
            score += Math.min(24, skillHits.length * 5);
            reasons.push(`Skills: ${skillHits.slice(0, 3).join(", ")}`);
        }

        const loc = location.toLowerCase();
        if (loc && (job.location.toLowerCase().includes(loc.split(/[\s,/]/)[0] || "") || (job.remote && loc.includes("remote")))) {
            score += 16;
            reasons.push(`Location match: ${location}`);
        } else if (job.remote) {
            score += 8;
            reasons.push("Remote-friendly opening");
        }

        // Boost based on requested experience filter
        if (filter === "intern") {
            if (job.type === "intern" || /\b(intern|internship|trainee|student|summer)\b/i.test(job.role + " " + job.description)) {
                score += 30;
                reasons.unshift("Internship match");
            }
        } else if (filter === "fresher" && /\b(fresher|entry|0[\s-]?year|graduate|trainee)\b/i.test(job.role + " " + job.description)) {
            score += 25;
            reasons.unshift("Fresher / Entry-Level");
        } else if (filter === "1year" && /\b(1[\s-]?year|0[\s-]?1|entry)\b/i.test(job.role + " " + job.description)) {
            score += 25;
            reasons.unshift("1 Year Experience match");
        }

        return {
            ...job,
            applyUrl: job.applyUrl || "#",
            source: job.source || `ProInterview curated (${profile.careerDomain})`,
            matchPercent: Math.min(98, score),
            matchReasons: reasons.slice(0, 4),
        };
    }).sort((a, b) => b.matchPercent - a.matchPercent);
}

/** Simple keyword filter over curated listings (backward compatible). */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase();
    const tag = (searchParams.get("tag") || "").toLowerCase();
    return NextResponse.json({ jobs: filterStatic(q, tag) });
}

/**
 * Resume + preferred-location match: searches public internet job boards
 * and returns ranked openings with apply links.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        let resumeText = String(body.resumeText || "").trim();
        let location = String(body.location || "").trim();
        const filter = String(body.experienceFilter || "all").trim();
        const targetDomain = String(body.targetDomain || body.jobType || "").trim();

        if (!location) {
            location = "India / Remote";
        }

        if (!resumeText || resumeText.length < 15) {
            resumeText = "Professional with experience in project coordination, operations, communication, and business problem solving.";
        }

        const rl = rateLimit(`jobs-match:${req.headers.get("x-forwarded-for") || "anon"}`, {
            limit: 25,
            windowMs: 15 * 60 * 1000,
        });

        const heuristic = extractResumeProfileHeuristic(resumeText, targetDomain || undefined);
        const profile = await enrichProfileWithGemini(resumeText, heuristic, targetDomain || undefined);
        
        let jobs: MatchedJob[] = [];
        let liveResult: any = { queries: [], sourcesTried: [] };

        if (rl.allowed) {
            try {
                liveResult = await searchMatchingJobs(profile, location, filter);
                jobs = liveResult.jobs || [];
            } catch (searchErr) {
                console.warn("[Jobs API] Live search encountered error, activating curated fallback:", searchErr);
            }
        }

        // Merge domain-specific curated fallback jobs matching candidate's career domain
        const fallback = scoreFallbackJobs(profile, location, filter);
        const seen = new Set(jobs.map((j) => j.id));
        for (const f of fallback) {
            if (!seen.has(f.id)) {
                jobs.push(f);
                seen.add(f.id);
            }
        }

        jobs = jobs.sort((a, b) => b.matchPercent - a.matchPercent).slice(0, 100);

        return NextResponse.json({
            jobs,
            profile,
            queries: liveResult.queries || [],
            sourcesTried: liveResult.sourcesTried || ["Curated Job Database"],
            usedFallback: true,
            webSearches: webSearchUrls(profile, location),
            location,
        });
    } catch (error: unknown) {
        console.error("[Jobs API] Error during job matching:", error);
        const heuristic = extractResumeProfileHeuristic("Professional with cross-functional experience.");
        const fallback = scoreFallbackJobs(heuristic, "India");
        return NextResponse.json({
            jobs: fallback,
            profile: heuristic,
            queries: buildSearchQueries(heuristic, "India"),
            sourcesTried: ["Curated Database Fallback"],
            usedFallback: true,
            webSearches: webSearchUrls(heuristic, "India"),
            location: "India",
        });
    }
}
