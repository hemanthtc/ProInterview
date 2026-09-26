import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import {
    extractResumeProfileHeuristic,
    searchMatchingJobs,
    webSearchUrls,
    INDIA_FALLBACK_JOBS,
    type JobType,
    type MatchedJob,
    type ResumeProfile,
} from "@/utils/jobSearch";

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

async function enrichProfileWithGemini(resumeText: string, heuristic: ResumeProfile): Promise<ResumeProfile> {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "dummy" || key.includes("your_gemini")) {
        return heuristic;
    }

    try {
        const prompt = `Extract a job-search profile from this resume. Return JSON only:
{
  "roles": ["target job titles, max 4"],
  "skills": ["technical skills, max 15"],
  "keywords": ["extra searchable keywords, max 12"],
  "seniority": "junior|mid|senior",
  "summary": "one short sentence"
}

RESUME:
${resumeText.slice(0, 9000)}`;

        const raw = await cachedGenerate(promptCacheKey("job-profile", resumeText.slice(0, 2000)), prompt);
        const parsed = parseJsonFromModel(raw) as Partial<ResumeProfile>;
        return {
            roles: Array.isArray(parsed.roles) && parsed.roles.length ? parsed.roles.map(String).slice(0, 5) : heuristic.roles,
            skills: Array.isArray(parsed.skills) && parsed.skills.length ? parsed.skills.map(String).slice(0, 15) : heuristic.skills,
            keywords:
                Array.isArray(parsed.keywords) && parsed.keywords.length
                    ? parsed.keywords.map(String).slice(0, 20)
                    : heuristic.keywords,
            seniority: typeof parsed.seniority === "string" ? parsed.seniority : heuristic.seniority,
            summary: typeof parsed.summary === "string" ? parsed.summary : heuristic.summary,
        };
    } catch {
        return heuristic;
    }
}

function scoreFallbackJobs(profile: ResumeProfile, location: string, filter?: string): MatchedJob[] {
    return ALL_FALLBACK_JOBS.map((job) => {
        const hay = `${job.role} ${job.company} ${job.location} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
        let score = 8;
        const reasons: string[] = ["Curated verified opening"];
        for (const role of profile.roles) {
            if (hay.includes(role.toLowerCase()) || role.toLowerCase().split(/\s+/).some((p) => p.length > 3 && hay.includes(p))) {
                score += 18;
                reasons.push(`Role overlap: ${role}`);
                break;
            }
        }
        const skillHits = profile.skills.filter((s) => hay.includes(s.toLowerCase()));
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
        } else if (filter === "fresher" && /\b(fresher|entry|0[\s-]?year|graduate)\b/i.test(job.role + " " + job.description)) {
            score += 25;
            reasons.unshift("Fresher / Entry-Level");
        } else if (filter === "1year" && /\b(1[\s-]?year|0[\s-]?1|entry)\b/i.test(job.role + " " + job.description)) {
            score += 25;
            reasons.unshift("1 Year Experience match");
        }

        return {
            ...job,
            applyUrl: job.applyUrl || "#",
            source: job.source || "ProInterview curated",
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

        if (!location) {
            location = "India / Remote";
        }

        if (!resumeText || resumeText.length < 15) {
            resumeText = "Software Engineer experienced with full stack web development, React, Node.js, Python, data structures, algorithms, and system design.";
        }

        const rl = rateLimit(`jobs-match:${req.headers.get("x-forwarded-for") || "anon"}`, {
            limit: 25,
            windowMs: 15 * 60 * 1000,
        });

        const heuristic = extractResumeProfileHeuristic(resumeText);
        const profile = await enrichProfileWithGemini(resumeText, heuristic);
        
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

        // Always merge matching curated fallback jobs so internships and freshers are never 0
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
        const heuristic = extractResumeProfileHeuristic("Software Engineer");
        const fallback = scoreFallbackJobs(heuristic, "India");
        return NextResponse.json({
            jobs: fallback,
            profile: heuristic,
            queries: [],
            sourcesTried: ["Curated Database Fallback"],
            usedFallback: true,
            webSearches: [],
            location: "India",
        });
    }
}
