export type JobType = "full-time" | "intern" | "contract";

export interface MatchedJob {
    id: string;
    company: string;
    role: string;
    location: string;
    type: JobType;
    remote: boolean;
    tags: string[];
    salaryRange?: string;
    description: string;
    applyUrl: string;
    postedAt: string;
    source: string;
    matchPercent: number;
    matchReasons: string[];
}

export interface ResumeProfile {
    roles: string[];
    skills: string[];
    keywords: string[];
    seniority: string;
    summary: string;
}

const TECH_SKILLS = [
    "javascript",
    "typescript",
    "python",
    "java",
    "kotlin",
    "swift",
    "go",
    "golang",
    "rust",
    "c++",
    "c#",
    "ruby",
    "php",
    "scala",
    "react",
    "next.js",
    "nextjs",
    "vue",
    "angular",
    "node",
    "nodejs",
    "express",
    "django",
    "flask",
    "spring",
    "fastapi",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "k8s",
    "terraform",
    "postgres",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "graphql",
    "rest",
    "sql",
    "nosql",
    "machine learning",
    "ml",
    "deep learning",
    "nlp",
    "pytorch",
    "tensorflow",
    "pandas",
    "spark",
    "hadoop",
    "kafka",
    "ci/cd",
    "jenkins",
    "github actions",
    "linux",
    "git",
    "figma",
    "ui/ux",
    "product management",
    "system design",
    "microservices",
    "devops",
    "sre",
    "android",
    "ios",
    "flutter",
    "react native",
    "tailwind",
    "html",
    "css",
];

const ROLE_HINTS = [
    "frontend engineer",
    "backend engineer",
    "full stack",
    "full-stack",
    "software engineer",
    "software developer",
    "sde",
    "ml engineer",
    "data scientist",
    "data engineer",
    "devops engineer",
    "sre",
    "product manager",
    "product designer",
    "ui/ux designer",
    "mobile engineer",
    "android developer",
    "ios developer",
    "qa engineer",
    "security engineer",
    "platform engineer",
];

function stripHtml(html: string): string {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeType(raw: string | undefined): JobType {
    const v = (raw || "").toLowerCase();
    if (v.includes("intern")) return "intern";
    if (v.includes("contract") || v.includes("freelance") || v.includes("temporary")) return "contract";
    return "full-time";
}

function uniqueStrings(items: string[], limit = 20): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
        const cleaned = item.trim().replace(/\s+/g, " ");
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cleaned);
        if (out.length >= limit) break;
    }
    return out;
}

function canonicalSkill(skill: string): string {
    const s = skill.toLowerCase();
    if (s === "nodejs" || s === "node") return "Node.js";
    if (s === "nextjs" || s === "next.js") return "Next.js";
    if (s === "golang" || s === "go") return "Go";
    if (s === "postgresql" || s === "postgres") return "PostgreSQL";
    if (s === "k8s" || s === "kubernetes") return "Kubernetes";
    if (s === "ml" || s === "machine learning") return "Machine Learning";
    return skill;
}

/** Heuristic resume profile when Gemini is unavailable or fails. */
export function extractResumeProfileHeuristic(resumeText: string): ResumeProfile {
    const lower = resumeText.toLowerCase();
    const matchedRaw = [...TECH_SKILLS]
        .sort((a, b) => b.length - a.length)
        .filter((s) => lower.includes(s));
    const skills: string[] = [];
    const covered = new Set<string>();
    for (const raw of matchedRaw) {
        // Skip short tokens already covered by a longer hit (e.g. "node" inside "nodejs"/"node.js")
        if ([...covered].some((c) => c.includes(raw) || raw.includes(c))) continue;
        covered.add(raw);
        skills.push(canonicalSkill(raw));
    }
    const roles = ROLE_HINTS.filter((r) => lower.includes(r)).map((r) =>
        r
            .split(" ")
            .map((w) => (w === "ui/ux" || w === "sde" || w === "sre" || w === "ml" ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
            .join(" ")
    );

    let seniority = "mid";
    if (/\b(intern|internship|student|fresher|entry[- ]level|junior)\b/i.test(resumeText)) seniority = "junior";
    else if (/\b(staff|principal|director|lead|senior|sr\.)\b/i.test(resumeText)) seniority = "senior";

    const keywordHits = [...skills, ...roles];
    if (roles.length === 0) {
        if (skills.some((s) => /react|vue|angular|frontend|css|html|figma/i.test(s))) roles.push("Frontend Engineer");
        else if (skills.some((s) => /python|java|go|node|django|spring|backend/i.test(s))) roles.push("Backend Engineer");
        else if (skills.some((s) => /ml|pytorch|tensorflow|data/i.test(s))) roles.push("ML Engineer");
        else roles.push("Software Engineer");
    }

    return {
        roles: uniqueStrings(roles, 5),
        skills: uniqueStrings(skills, 15),
        keywords: uniqueStrings(keywordHits, 20),
        seniority,
        summary: `Inferred ${seniority}-level profile focused on ${uniqueStrings(roles, 2).join(", ") || "software"}`,
    };
}

export function buildSearchQueries(profile: ResumeProfile, location: string): string[] {
    const loc = location.trim();
    const primaryRole = profile.roles[0] || "Software Engineer";
    const topSkills = profile.skills.slice(0, 3).join(" ");
    const queries = [
        [primaryRole, topSkills, loc].filter(Boolean).join(" ").trim(),
        [primaryRole, loc].filter(Boolean).join(" ").trim(),
        profile.skills.slice(0, 2).join(" "),
    ].filter(Boolean);
    return uniqueStrings(queries, 4);
}

/**
 * Synonym groups for major Indian tech hubs so "Bangalore" also matches "Bengaluru",
 * "Gurgaon" matches "Gurugram", NCR listings match "Delhi", etc.
 */
const INDIA_CITY_SYNONYMS: Record<string, string[]> = {
    bangalore: ["bangalore", "bengaluru"],
    bengaluru: ["bangalore", "bengaluru"],
    hyderabad: ["hyderabad", "secunderabad"],
    mumbai: ["mumbai", "bombay"],
    delhi: ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "noida"],
    ncr: ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "noida"],
    pune: ["pune"],
    chennai: ["chennai", "madras"],
    gurgaon: ["gurgaon", "gurugram", "ncr", "delhi"],
    gurugram: ["gurgaon", "gurugram", "ncr", "delhi"],
    noida: ["noida", "ncr", "delhi"],
    kolkata: ["kolkata", "calcutta"],
};

/** Returns the synonym group covering `pref` (an India city name), or null if not an India city. */
function indiaCitySynonyms(pref: string): string[] | null {
    for (const [city, group] of Object.entries(INDIA_CITY_SYNONYMS)) {
        if (pref.includes(city)) return group;
    }
    return null;
}

function locationMatches(jobLocation: string, preferred: string, remote: boolean): { score: number; reason?: string } {
    const pref = preferred.trim().toLowerCase();
    if (!pref) return { score: remote ? 8 : 0, reason: remote ? "Remote-friendly opening" : undefined };

    const loc = jobLocation.toLowerCase();
    const indiaGroup = indiaCitySynonyms(pref);
    const locIsIndia =
        loc.includes("india") ||
        /(^|,\s*)in(\s*$|\s*,)/.test(loc) ||
        (indiaGroup ? indiaGroup.some((c) => loc.includes(c)) : false);

    if (pref.includes("remote") || pref === "anywhere") {
        const wantsIndia = indiaGroup !== null || pref.includes("india");
        if (wantsIndia && remote && locIsIndia) {
            return { score: 32, reason: "Remote role based in India" };
        }
        return remote || loc.includes("remote") || loc.includes("worldwide") || loc.includes("anywhere")
            ? { score: 28, reason: "Matches remote preference" }
            : { score: 0 };
    }

    if (indiaGroup) {
        const cityHit = indiaGroup.some((c) => loc.includes(c));
        if (cityHit) return { score: 34, reason: `Location match: ${preferred} (India)` };
        if (locIsIndia) {
            return { score: 20, reason: `India-based opening near ${preferred}` };
        }
    }

    const tokens = pref.split(/[\s,/|-]+/).filter((t) => t.length > 2);
    const hit = tokens.some((t) => loc.includes(t));
    if (hit) return { score: 30, reason: `Location match: ${preferred}` };
    if (remote || loc.includes("remote") || loc.includes("worldwide") || loc.includes("anywhere")) {
        return { score: 14, reason: "Remote option for your preferred location" };
    }
    return { score: 0 };
}

function scoreJob(job: Omit<MatchedJob, "matchPercent" | "matchReasons">, profile: ResumeProfile, preferredLocation: string): MatchedJob {
    const hay = `${job.role} ${job.company} ${job.location} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    for (const role of profile.roles) {
        const r = role.toLowerCase();
        if (r && hay.includes(r)) {
            score += 22;
            reasons.push(`Role overlap: ${role}`);
            break;
        }
        const parts = r.split(/\s+/).filter((p) => p.length > 3);
        const partHits = parts.filter((p) => hay.includes(p)).length;
        if (partHits >= 1) {
            score += 10 + partHits * 4;
            reasons.push(`Related to ${role}`);
            break;
        }
    }

    const skillHits = profile.skills.filter((s) => hay.includes(s.toLowerCase()));
    if (skillHits.length) {
        score += Math.min(36, skillHits.length * 6);
        reasons.push(`Skills: ${skillHits.slice(0, 4).join(", ")}`);
    }

    for (const kw of profile.keywords) {
        if (kw.length > 2 && hay.includes(kw.toLowerCase()) && !skillHits.map((s) => s.toLowerCase()).includes(kw.toLowerCase())) {
            score += 3;
        }
    }

    const loc = locationMatches(job.location, preferredLocation, job.remote);
    score += loc.score;
    if (loc.reason) reasons.push(loc.reason);

    if (profile.seniority === "junior" && job.type === "intern") {
        score += 8;
        reasons.push("Internship-friendly for junior profile");
    }
    if (profile.seniority === "senior" && /\b(senior|staff|lead|principal)\b/i.test(job.role)) {
        score += 8;
        reasons.push("Seniority aligned");
    }

    const matchPercent = Math.max(0, Math.min(98, Math.round(score)));
    return {
        ...job,
        matchPercent,
        matchReasons: uniqueStrings(reasons, 5),
    };
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, {
            signal: ctrl.signal,
            headers: {
                "User-Agent": "ProInterviewJobMatcher/1.0",
                Accept: "application/json",
            },
            next: { revalidate: 0 },
        });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchRemotive(query: string): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons">[]> {
    const url = `https://remotive.com/api/remote-jobs?limit=30${query ? `&search=${encodeURIComponent(query)}` : ""}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
        jobs?: Array<{
            id: number | string;
            url: string;
            title: string;
            company_name: string;
            tags?: string[];
            job_type?: string;
            publication_date?: string;
            candidate_required_location?: string;
            salary?: string;
            description?: string;
        }>;
    };
    return (data.jobs || []).map((j) => ({
        id: `remotive_${j.id}`,
        company: j.company_name || "Unknown",
        role: j.title || "Role",
        location: j.candidate_required_location || "Remote",
        type: normalizeType(j.job_type),
        remote: true,
        tags: (j.tags || []).slice(0, 8),
        salaryRange: j.salary || undefined,
        description: stripHtml(j.description || "").slice(0, 320),
        applyUrl: j.url,
        postedAt: (j.publication_date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
        source: "Remotive",
    }));
}

async function fetchArbeitnow(query: string): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons">[]> {
    const url = query
        ? `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`
        : "https://www.arbeitnow.com/api/job-board-api";
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
        data?: Array<{
            slug: string;
            company_name: string;
            title: string;
            description?: string;
            remote?: boolean;
            url: string;
            tags?: string[];
            job_types?: string[];
            location?: string;
            created_at?: string;
        }>;
    };
    return (data.data || []).slice(0, 40).map((j) => ({
        id: `arbeitnow_${j.slug}`,
        company: j.company_name || "Unknown",
        role: j.title || "Role",
        location: j.location || (j.remote ? "Remote" : "Unspecified"),
        type: normalizeType((j.job_types || [])[0]),
        remote: Boolean(j.remote),
        tags: (j.tags || []).slice(0, 8),
        description: stripHtml(j.description || "").slice(0, 320),
        applyUrl: j.url,
        postedAt: (j.created_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
        source: "Arbeitnow",
    }));
}

async function fetchRemoteOK(query: string): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons">[]> {
    const res = await fetchWithTimeout("https://remoteok.com/api");
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
        id?: string | number;
        slug?: string;
        company?: string;
        position?: string;
        tags?: string[];
        description?: string;
        location?: string;
        apply_url?: string;
        url?: string;
        date?: string;
        salary_min?: number;
        salary_max?: number;
    }>;
    const q = query.toLowerCase();
    const jobs = data
        .filter((j) => j && j.position && (j.apply_url || j.url))
        .filter((j) => {
            if (!q) return true;
            const hay = `${j.position} ${j.company} ${(j.tags || []).join(" ")} ${j.location}`.toLowerCase();
            return q.split(/\s+/).some((token) => token.length > 2 && hay.includes(token));
        })
        .slice(0, 40);

    return jobs.map((j) => {
        const salary =
            j.salary_min && j.salary_max
                ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round(j.salary_max / 1000)}k`
                : undefined;
        return {
            id: `remoteok_${j.id || j.slug}`,
            company: j.company || "Unknown",
            role: j.position || "Role",
            location: j.location || "Remote",
            type: "full-time" as const,
            remote: true,
            tags: (j.tags || []).slice(0, 8),
            salaryRange: salary,
            description: stripHtml(j.description || "").slice(0, 320),
            applyUrl: j.apply_url || j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
            postedAt: (j.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
            source: "RemoteOK",
        };
    });
}

/**
 * Adzuna India job search (https://developer.adzuna.com). Requires ADZUNA_APP_ID +
 * ADZUNA_APP_KEY; returns an empty list (no network call) when either is missing so
 * callers can include it in sourcesTried without special-casing configuration.
 */
async function fetchAdzunaIndia(query: string, location: string): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons">[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];

    const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "30",
        "content-type": "application/json",
    });
    if (query) params.set("what", query);
    const where = location && !location.toLowerCase().includes("remote") ? location : "";
    if (where) params.set("where", where);

    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params.toString()}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
        results?: Array<{
            id?: string | number;
            title?: string;
            company?: { display_name?: string };
            location?: { display_name?: string };
            description?: string;
            redirect_url?: string;
            created?: string;
            contract_type?: string;
            contract_time?: string;
            salary_min?: number;
            salary_max?: number;
            category?: { label?: string };
        }>;
    };
    return (data.results || [])
        .filter((j) => j.redirect_url)
        .slice(0, 40)
        .map((j) => {
            const salary =
                j.salary_min && j.salary_max
                    ? `₹${Math.round(j.salary_min / 1000)}k–₹${Math.round(j.salary_max / 1000)}k`
                    : undefined;
            const jobLocation = j.location?.display_name || "India";
            return {
                id: `adzuna_${j.id}`,
                company: j.company?.display_name || "Unknown",
                role: j.title || "Role",
                location: jobLocation,
                type: normalizeType(j.contract_type || j.contract_time),
                remote: /remote/i.test(jobLocation),
                tags: j.category?.label ? [j.category.label] : [],
                salaryRange: salary,
                description: stripHtml(j.description || "").slice(0, 320),
                applyUrl: j.redirect_url || "",
                postedAt: (j.created || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
                source: "Adzuna India",
            };
        });
}

/**
 * Curated India-focused listings (Bangalore/Hyderabad heavy) used as a top-up when
 * live sources return too few results for an India-based preferred location.
 */
export const INDIA_FALLBACK_JOBS: Omit<MatchedJob, "matchPercent" | "matchReasons">[] = [
    {
        id: "job_in_razorpay_be",
        company: "Razorpay",
        role: "Backend Engineer",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Node.js", "Payments", "API"],
        salaryRange: "₹18L–₹32L",
        description: "Build payment and banking infrastructure powering businesses across India.",
        applyUrl: "https://razorpay.com/jobs/",
        postedAt: "2026-07-28",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_swiggy_fullstack",
        company: "Swiggy",
        role: "Full-Stack Engineer",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["React", "Node.js", "Microservices"],
        salaryRange: "₹20L–₹38L",
        description: "Ship consumer and logistics features for one of India's largest delivery platforms.",
        applyUrl: "https://careers.swiggy.com/",
        postedAt: "2026-07-26",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_flipkart_sde2",
        company: "Flipkart",
        role: "SDE II",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Java", "Distributed Systems", "Scale"],
        salaryRange: "₹22L–₹40L",
        description: "Work on high-throughput commerce systems serving hundreds of millions of users.",
        applyUrl: "https://www.flipkartcareers.com/",
        postedAt: "2026-07-24",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_microsoft_swe",
        company: "Microsoft India",
        role: "Software Engineer",
        location: "Hyderabad",
        type: "full-time",
        remote: false,
        tags: ["C#", "Azure", "Cloud"],
        salaryRange: "₹25L–₹45L",
        description: "Build cloud services for Microsoft's Hyderabad engineering center.",
        applyUrl: "https://careers.microsoft.com/",
        postedAt: "2026-07-27",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_salesforce_ase",
        company: "Salesforce",
        role: "Associate Software Engineer",
        location: "Hyderabad",
        type: "full-time",
        remote: false,
        tags: ["Java", "Apex", "SaaS"],
        salaryRange: "₹15L–₹26L",
        description: "Join Salesforce's Hyderabad hub building multi-tenant SaaS platform features.",
        applyUrl: "https://careers.salesforce.com/",
        postedAt: "2026-07-21",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_remote_india_devrel",
        company: "Postman",
        role: "Developer Advocate",
        location: "Remote (India)",
        type: "full-time",
        remote: true,
        tags: ["API", "Community", "Content"],
        salaryRange: "₹16L–₹28L",
        description: "Fully remote role for engineers across India supporting the API developer community.",
        applyUrl: "https://www.postman.com/company/careers/",
        postedAt: "2026-07-19",
        source: "ProInterview curated (India)",
    },
];

/** Fetch live openings from public job boards and rank them against the resume profile. */
export async function searchMatchingJobs(
    profile: ResumeProfile,
    preferredLocation: string
): Promise<{ jobs: MatchedJob[]; sourcesTried: string[]; queries: string[] }> {
    const queries = buildSearchQueries(profile, preferredLocation);
    const primary = queries[0] || profile.roles[0] || "software engineer";
    const sourcesTried: string[] = [];
    const collected: Omit<MatchedJob, "matchPercent" | "matchReasons">[] = [];

    const tasks: Array<{ name: string; run: () => Promise<Omit<MatchedJob, "matchPercent" | "matchReasons">[]> }> = [
        { name: "Remotive", run: () => fetchRemotive(primary) },
        { name: "Arbeitnow", run: () => fetchArbeitnow(primary) },
        { name: "RemoteOK", run: () => fetchRemoteOK(primary) },
        { name: "Adzuna India", run: () => fetchAdzunaIndia(primary, preferredLocation) },
    ];

    const settled = await Promise.allSettled(
        tasks.map(async (t) => {
            try {
                const rows = await t.run();
                return rows;
            } finally {
                sourcesTried.push(t.name);
            }
        })
    );

    for (const result of settled) {
        if (result.status === "fulfilled") collected.push(...result.value);
    }

    const byId = new Map<string, Omit<MatchedJob, "matchPercent" | "matchReasons">>();
    for (const job of collected) {
        if (!job.applyUrl) continue;
        if (!byId.has(job.id)) byId.set(job.id, job);
    }

    const ranked = [...byId.values()]
        .map((job) => scoreJob(job, profile, preferredLocation))
        .filter((j) => j.matchPercent >= 12)
        .sort((a, b) => b.matchPercent - a.matchPercent)
        .slice(0, 30);

    return { jobs: ranked, sourcesTried, queries };
}

export function webSearchUrls(profile: ResumeProfile, location: string): { label: string; url: string }[] {
    const q = encodeURIComponent([profile.roles[0] || "software engineer", "jobs", location].filter(Boolean).join(" "));
    return [
        { label: "Google Jobs search", url: `https://www.google.com/search?q=${q}` },
        {
            label: "LinkedIn Jobs search",
            url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(profile.roles[0] || "software engineer")}&location=${encodeURIComponent(location || "")}`,
        },
    ];
}
