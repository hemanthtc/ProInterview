import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import {
    extractResumeProfileHeuristic,
    searchMatchingJobs,
    scoreJob,
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
    // Commerce / Finance
    {
        id: "job_deloitte_accounts",
        company: "Deloitte India",
        role: "Accounts Executive / Audit Associate",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Accounting", "Excel", "Tally", "GST", "Auditing"],
        salaryRange: "₹5L–₹8L",
        description: "Manage financial statements, bank reconciliations, GST filings, and client audit workbooks.",
        applyUrl: "https://www2.deloitte.com/in/en/careers.html",
        postedAt: "2026-08-01",
    },
    {
        id: "job_hdfc_fin_analyst",
        company: "HDFC Bank",
        role: "Financial Analyst / Credit Associate",
        location: "Mumbai / Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Financial Analysis", "Excel", "Power BI", "Banking"],
        salaryRange: "₹6L–₹10L",
        description: "Analyze corporate balance sheets, credit risk models, and revenue forecasts for business portfolios.",
        applyUrl: "https://www.hdfcbank.com/personal/careers",
        postedAt: "2026-08-02",
    },
    // Mechanical Engineering
    {
        id: "job_tata_mechanical",
        company: "Tata Motors",
        role: "Mechanical Design Engineer",
        location: "Pune / Bangalore",
        type: "full-time",
        remote: false,
        tags: ["AutoCAD", "CAD", "SolidWorks", "Manufacturing", "Machine Design"],
        salaryRange: "₹6.5L–₹9.5L",
        description: "CAD part modeling, manufacturing assembly drawings, tolerance stack-up, and mechanical simulations.",
        applyUrl: "https://www.tatamotors.com/careers/",
        postedAt: "2026-08-01",
    },
    // Civil Engineering
    {
        id: "job_lt_civil_eng",
        company: "L&T Construction",
        role: "Graduate Civil Engineer / Site Supervisor",
        location: "Bangalore / Hyderabad",
        type: "full-time",
        remote: false,
        tags: ["AutoCAD", "STAAD", "Construction", "Structural Design"],
        salaryRange: "₹5.5L–₹8.5L",
        description: "Civil infrastructure execution, structural inspection, bar bending schedules, and contractor coordination.",
        applyUrl: "https://www.lntecc.com/careers/",
        postedAt: "2026-08-02",
    },
    // Business / Management / Marketing
    {
        id: "job_unilever_marketing",
        company: "Hindustan Unilever",
        role: "Marketing & Operations Trainee",
        location: "Bangalore / Mumbai",
        type: "full-time",
        remote: false,
        tags: ["Marketing", "Operations", "Market Research", "Business"],
        salaryRange: "₹8L–₹12L",
        description: "Manage channel partner programs, regional brand activations, consumer insights, and campaign analytics.",
        applyUrl: "https://www.hul.co.in/careers/",
        postedAt: "2026-08-03",
    },
    // Pharmacy / Life Sciences
    {
        id: "job_sunpharma_qc",
        company: "Sun Pharma",
        role: "Quality Control Chemist / Pharmacist",
        location: "Bangalore / Hyderabad",
        type: "full-time",
        remote: false,
        tags: ["Pharmacy", "Quality Control", "Chemistry", "GMP"],
        salaryRange: "₹4.5L–₹7L",
        description: "Laboratory testing of pharmaceutical formulations, HPLC quality checks, and GMP compliance documentation.",
        applyUrl: "https://sunpharma.com/careers/",
        postedAt: "2026-08-04",
    },
    // Software / Tech (Preserved)
    {
        id: "job_stripe_be",
        company: "Stripe",
        role: "Backend Engineer",
        location: "Remote / Bangalore",
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
        location: "Bangalore / Remote",
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
];

/** Static fallback + curated India listings combined across diverse backgrounds. */
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
        const prompt = `You are an expert career profiler and resume analyst.
Analyze the following resume with an EDUCATION-FIRST approach.
CRITICAL INSTRUCTION:
1. The candidate's EDUCATION BACKGROUND (degree, field, major, branch) is the primary determinant of their primary career domain and job families.
2. DO NOT assume the candidate is a Software Engineer or in IT simply because the resume mentions programming languages, digital tools, or technical projects.
3. Technical tools in a non-software background (e.g. Python or Excel in a B.Com resume) represent analytical skills or secondary transition opportunities, NOT a software engineering primary domain.
4. Extract structured details matching this JSON structure ONLY:
{
  "education": {
    "degree": "e.g. B.Com, B.Tech, BBA, B.Sc, B.E, MBA, B.Pharm, B.Arch, Diploma",
    "field": "e.g. Finance, Computer Science, Mechanical Engineering, Civil Engineering, Biology, Marketing",
    "specialization": "e.g. Accounting, CAD, Structural, Marketing",
    "level": "undergraduate|postgraduate|diploma|certification",
    "graduationYear": "e.g. 2024",
    "normalizedDegree": "e.g. Bachelor of Commerce, Bachelor of Technology - Computer Science",
    "normalizedField": "e.g. Finance & Accounting, Mechanical Engineering, Civil Engineering"
  },
  "primaryDomains": ["Primary career domains derived from education, e.g. Commerce, Accounting, Finance"],
  "secondaryDomains": ["Secondary domains supported by skills or projects"],
  "roles": ["Target job families derived from primary education domain, e.g. Accountant, Accounts Executive, Finance Executive"],
  "skills": ["Canonical skills extracted from resume"],
  "technicalSkills": ["Coding, software tools, CAD, data tools"],
  "professionalSkills": ["Domain specific non-coding skills like GST, auditing, surveying, manufacturing"],
  "projects": [
    {
      "title": "Project title",
      "domain": "Domain of the project",
      "technologies": ["Tools used"],
      "skills": ["Skills demonstrated"]
    }
  ],
  "experience": ["Work experience summaries"],
  "certifications": ["Certifications"],
  "languages": ["Languages"],
  "keywords": ["Search keywords"],
  "seniority": "junior|mid|senior",
  "summary": "One sentence summary highlighting education and career domain"
}

RESUME:
${resumeText.slice(0, 9000)}`;

        const raw = await cachedGenerate(promptCacheKey("job-profile-edu-v2", resumeText.slice(0, 2000)), prompt);
        const parsed = parseJsonFromModel(raw) as Partial<ResumeProfile>;

        return {
            education: {
                degree: parsed.education?.degree || heuristic.education.degree,
                field: parsed.education?.field || heuristic.education.field,
                specialization: parsed.education?.specialization || heuristic.education.specialization,
                level: parsed.education?.level || heuristic.education.level,
                graduationYear: parsed.education?.graduationYear || heuristic.education.graduationYear,
                normalizedDegree: parsed.education?.normalizedDegree || heuristic.education.normalizedDegree,
                normalizedField: parsed.education?.normalizedField || heuristic.education.normalizedField,
            },
            primaryDomains:
                Array.isArray(parsed.primaryDomains) && parsed.primaryDomains.length
                    ? parsed.primaryDomains.map(String).slice(0, 6)
                    : heuristic.primaryDomains,
            secondaryDomains:
                Array.isArray(parsed.secondaryDomains)
                    ? parsed.secondaryDomains.map(String).slice(0, 6)
                    : heuristic.secondaryDomains,
            roles:
                Array.isArray(parsed.roles) && parsed.roles.length
                    ? parsed.roles.map(String).slice(0, 8)
                    : heuristic.roles,
            skills:
                Array.isArray(parsed.skills) && parsed.skills.length
                    ? parsed.skills.map(String).slice(0, 20)
                    : heuristic.skills,
            technicalSkills:
                Array.isArray(parsed.technicalSkills)
                    ? parsed.technicalSkills.map(String).slice(0, 15)
                    : heuristic.technicalSkills,
            professionalSkills:
                Array.isArray(parsed.professionalSkills)
                    ? parsed.professionalSkills.map(String).slice(0, 15)
                    : heuristic.professionalSkills,
            projects:
                Array.isArray(parsed.projects) && parsed.projects.length
                    ? parsed.projects.slice(0, 5)
                    : heuristic.projects,
            experience:
                Array.isArray(parsed.experience)
                    ? parsed.experience.map(String).slice(0, 5)
                    : heuristic.experience,
            certifications:
                Array.isArray(parsed.certifications)
                    ? parsed.certifications.map(String).slice(0, 5)
                    : heuristic.certifications,
            languages:
                Array.isArray(parsed.languages)
                    ? parsed.languages.map(String).slice(0, 5)
                    : heuristic.languages,
            keywords:
                Array.isArray(parsed.keywords) && parsed.keywords.length
                    ? parsed.keywords.map(String).slice(0, 25)
                    : heuristic.keywords,
            seniority: typeof parsed.seniority === "string" ? parsed.seniority : heuristic.seniority,
            summary: typeof parsed.summary === "string" ? parsed.summary : heuristic.summary,
        };
    } catch {
        return heuristic;
    }
}

function scoreFallbackJobs(
    profile: ResumeProfile,
    location: string,
    filter?: string,
    jobSearchQuery?: string
): MatchedJob[] {
    return ALL_FALLBACK_JOBS.map((job) => {
        const base = {
            ...job,
            applyUrl: job.applyUrl || "#",
            source: job.source || "ProInterview curated",
        };
        return scoreJob(base, profile, location, filter, jobSearchQuery);
    })
        .filter((j) => j.matchPercent >= 10)
        .sort((a, b) => b.matchPercent - a.matchPercent);
}

/** Simple keyword filter over curated listings (backward compatible). */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase();
    const tag = (searchParams.get("tag") || "").toLowerCase();
    return NextResponse.json({ jobs: filterStatic(q, tag) });
}

/**
 * Education-first Resume + preferred-location match: searches public internet job boards
 * and returns ranked openings with apply links and match explanations.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const resumeText = String(body.resumeText || "").trim();
        let location = String(body.location || "").trim();
        const filter = String(body.experienceFilter || "all").trim();
        const jobSearchQuery = String(body.jobSearchQuery || "").trim();

        if (!location) {
            location = "India / Remote";
        }

        // Do not fabricate a software engineer profile when no valid resume is supplied
        if (!resumeText || resumeText.length < 15) {
            return NextResponse.json(
                {
                    error: "Please upload or paste your resume to discover matching job opportunities.",
                    jobs: [],
                    profile: null,
                },
                { status: 400 }
            );
        }

        const rl = rateLimit(`jobs-match:${req.headers.get("x-forwarded-for") || "anon"}`, {
            limit: 25,
            windowMs: 15 * 60 * 1000,
        });

        // 1. Education-First Heuristic Analysis
        const heuristic = extractResumeProfileHeuristic(resumeText);

        // 2. Gemini Enrichment (if configured)
        const profile = await enrichProfileWithGemini(resumeText, heuristic);

        let jobs: MatchedJob[] = [];
        let liveResult: { queries: string[]; sourcesTried: string[]; jobs?: MatchedJob[] } = {
            queries: [],
            sourcesTried: [],
        };

        if (rl.allowed) {
            try {
                liveResult = await searchMatchingJobs(profile, location, filter, jobSearchQuery);
                jobs = liveResult.jobs || [];
            } catch (searchErr) {
                console.warn("[Jobs API] Live search encountered error, activating curated fallback:", searchErr);
            }
        }

        // Merge matching curated fallback jobs appropriate for the candidate's education & domain
        const fallback = scoreFallbackJobs(profile, location, filter, jobSearchQuery);
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
            webSearches: webSearchUrls(profile, location, jobSearchQuery),
            location,
        });
    } catch (error: unknown) {
        console.error("[Jobs API] Error during job matching:", error);
        return NextResponse.json(
            {
                error: "An error occurred while matching jobs. Please verify your resume and try again.",
                jobs: [],
                profile: null,
                queries: [],
                sourcesTried: [],
                usedFallback: false,
                webSearches: [],
                location: "India",
            },
            { status: 500 }
        );
    }
}
