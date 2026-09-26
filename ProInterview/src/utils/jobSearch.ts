import { detectCareerDomain } from "./domainTaxonomy";

export type JobType = "full-time" | "intern" | "contract";
export type SeniorityLevel = "intern" | "entry" | "junior" | "mid" | "senior" | "lead" | "unknown";

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
    careerDomain: string;
    subDomain?: string;
    roles: string[];
    relatedRoles: string[];
    skills: string[];
    softSkills?: string[];
    industries?: string[];
    jobFunctions?: string[];
    education?: string[];
    seniority: SeniorityLevel | string;
    yearsOfExperience?: number;
    certifications?: string[];
    toolsAndTechnologies?: string[];
    keywords: string[];
    summary: string;
    confidence?: number;
    targetDomain?: string;
    isUserSpecified?: boolean;
    projects?: string[];
}

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
    if (s === "autocad" || s === "cad") return "AutoCAD";
    if (s === "solidworks") return "SolidWorks";
    if (s === "staad.pro" || s === "staad pro") return "STAAD.Pro";
    if (s === "tally" || s === "tally prime") return "Tally";
    return skill;
}

/** Domain-neutral heuristic resume profile when Gemini is unavailable or fails. Accepts optional user-typed targetDomain. */
export function extractResumeProfileHeuristic(resumeText: string, userTargetDomain?: string): ResumeProfile {
    const detected = detectCareerDomain(resumeText, userTargetDomain);

    // Seniority detection
    let seniority: SeniorityLevel = "mid";
    if (/\b(intern|internship|trainee|apprentice|student|campus)\b/i.test(resumeText)) {
        seniority = "intern";
    } else if (/\b(fresher|entry[- ]level|0[\s-]?year|0[\s-]?yr|graduate|junior)\b/i.test(resumeText)) {
        seniority = "entry";
    } else if (/\b(lead|director|vp|principal|head of)\b/i.test(resumeText)) {
        seniority = "lead";
    } else if (/\b(senior|sr\.|staff)\b/i.test(resumeText)) {
        seniority = "senior";
    }

    // Years of experience detection
    let yearsOfExperience: number | undefined;
    const expMatch = resumeText.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i) ||
                     resumeText.match(/experience\s*:\s*(\d+)\+?\s*(?:years?|yrs?)/i);
    if (expMatch && expMatch[1]) {
        const parsed = parseInt(expMatch[1], 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 50) {
            yearsOfExperience = parsed;
        }
    }

    // Education detection: degrees, branches, universities
    const education: string[] = [];
    const eduPatterns = [
        /\b(b\.?e\.?|b\.?tech\.?|m\.?e\.?|m\.?tech\.?|diploma)\s+(?:in\s+)?([a-z\s]+?)(?:,|\.|\n|$)/gi,
        /\b(b\.?com\.?|m\.?com\.?|mba|bba|pgdm|ca|cfa|cpa|bca|mca|b\.?sc\.?|m\.?sc\.?|mbbs|bds|b\.?pharm|b\.?des\.?|ll\.?b\.?|ll\.?m\.?|b\.?arch)\b/gi,
    ];
    for (const pat of eduPatterns) {
        const matches = resumeText.match(pat);
        if (matches) {
            for (const m of matches) {
                const cleaned = m.trim().replace(/[\r\n]+/g, " ");
                if (cleaned.length > 2 && !education.includes(cleaned)) {
                    education.push(cleaned);
                }
            }
        }
    }

    // Academic & Industry Projects detection
    const projects: string[] = [];
    const projectSection = resumeText.match(/(?:projects?|academic projects?|key projects?)\s*[:\n]([\s\S]*?)(?=(?:experience|work history|education|skills|certifications|awards|$))/i);
    if (projectSection && projectSection[1]) {
        const lines = projectSection[1].split(/\n/).map((l) => l.trim().replace(/^[-*•\d.]\s*/, "")).filter((l) => l.length > 5 && l.length < 100);
        projects.push(...lines.slice(0, 4));
    }

    const keywordHits = uniqueStrings([
        ...detected.skills.map(canonicalSkill),
        ...detected.toolsAndTechnologies.map(canonicalSkill),
        ...detected.roles,
        ...detected.relatedRoles,
    ], 20);

    const summary = detected.isUserSpecified
        ? `Targeting ${detected.careerDomain} with ${seniority}-level experience in ${uniqueStrings(detected.roles, 2).join(", ")}`
        : `Inferred ${seniority}-level ${detected.careerDomain} profile focused on ${uniqueStrings(detected.roles, 2).join(", ") || detected.careerDomain}`;

    return {
        careerDomain: detected.careerDomain,
        subDomain: detected.subDomain,
        roles: uniqueStrings(detected.roles, 5),
        relatedRoles: uniqueStrings(detected.relatedRoles, 5),
        skills: uniqueStrings(detected.skills.map(canonicalSkill), 15),
        toolsAndTechnologies: uniqueStrings(detected.toolsAndTechnologies.map(canonicalSkill), 10),
        industries: detected.industries,
        education: education.slice(0, 4),
        seniority,
        yearsOfExperience,
        keywords: keywordHits,
        summary,
        confidence: detected.confidence,
        targetDomain: userTargetDomain?.trim() || undefined,
        isUserSpecified: detected.isUserSpecified,
        projects: projects.length ? projects : undefined,
    };
}

export function buildSearchQueries(profile: ResumeProfile, location: string, filter?: string): string[] {
    const loc = location.trim();
    const primaryRole = profile.roles[0] || profile.careerDomain || "Professional";
    const relatedRole = profile.relatedRoles[0] || (profile.roles.length > 1 ? profile.roles[1] : undefined);
    const domain = profile.careerDomain;
    const topSkills = (profile.skills || []).slice(0, 2).join(" ");
    
    if (filter === "intern") {
        const queries = [
            [primaryRole, "Intern", loc].filter(Boolean).join(" ").trim(),
            relatedRole ? [relatedRole, "Intern", loc].filter(Boolean).join(" ").trim() : "",
            [domain, "Intern", loc].filter(Boolean).join(" ").trim(),
            ["Internship", loc].filter(Boolean).join(" ").trim(),
        ].filter(Boolean);
        return uniqueStrings(queries, 4);
    }

    const queries = [
        [primaryRole, loc].filter(Boolean).join(" ").trim(),
        domain && !primaryRole.toLowerCase().includes(domain.toLowerCase())
            ? [domain, primaryRole, loc].filter(Boolean).join(" ").trim()
            : "",
        topSkills ? [primaryRole, topSkills, loc].filter(Boolean).join(" ").trim() : "",
        relatedRole ? [relatedRole, loc].filter(Boolean).join(" ").trim() : "",
        profile.subDomain ? [profile.subDomain, primaryRole, loc].filter(Boolean).join(" ").trim() : "",
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

function scoreJob(
    job: Omit<MatchedJob, "matchPercent" | "matchReasons">,
    profile: ResumeProfile,
    preferredLocation: string,
    filter?: string
): MatchedJob {
    const hay = `${job.role} ${job.company} ${job.location} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
    const roleLower = job.role.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    // Cross-domain mismatch check:
    // If candidate domain is non-software (e.g. Mechanical, Civil, Finance, HR, Healthcare)
    // and job is specifically a Software Engineer / SDE / Web Dev role, penalize heavily
    const candidateIsTech = /software|it|computer|data|analytics|web|full[\s-]?stack/i.test(profile.careerDomain);
    const jobIsTech = /\b(software engineer|software developer|sde|frontend developer|backend developer|full[\s-]?stack developer|react developer|node\.?js developer|devops engineer)\b/i.test(roleLower);

    if (!candidateIsTech && jobIsTech) {
        score -= 40;
    } else {
        // Role match
        let roleMatched = false;
        for (const role of profile.roles) {
            const r = role.toLowerCase();
            if (r && hay.includes(r)) {
                score += 26;
                reasons.push(`Role match: ${role}`);
                roleMatched = true;
                break;
            }
            const parts = r.split(/\s+/).filter((p) => p.length > 3);
            const partHits = parts.filter((p) => hay.includes(p)).length;
            if (partHits >= 1) {
                score += 12 + partHits * 3;
                reasons.push(`Related to ${role}`);
                roleMatched = true;
                break;
            }
        }

        if (!roleMatched && profile.relatedRoles) {
            for (const rel of profile.relatedRoles) {
                const r = rel.toLowerCase();
                if (r && hay.includes(r)) {
                    score += 18;
                    reasons.push(`Related role: ${rel}`);
                    break;
                }
            }
        }
    }

    // Domain match
    if (profile.careerDomain && profile.careerDomain !== "General / Multidisciplinary") {
        const domLower = profile.careerDomain.toLowerCase();
        if (hay.includes(domLower) || (profile.subDomain && hay.includes(profile.subDomain.toLowerCase()))) {
            score += 16;
            reasons.push(`Domain match: ${profile.careerDomain}`);
        }
        if (profile.isUserSpecified && profile.targetDomain && hay.includes(profile.targetDomain.toLowerCase())) {
            score += 10;
            reasons.push(`Target field match: ${profile.targetDomain}`);
        }
    }

    // Skill & tool hits
    const allCandidateSkills = [...(profile.skills || []), ...(profile.toolsAndTechnologies || [])];
    const skillHits = allCandidateSkills.filter((s) => s.length > 2 && hay.includes(s.toLowerCase()));
    if (skillHits.length) {
        score += Math.min(32, skillHits.length * 5);
        reasons.push(`Skills: ${skillHits.slice(0, 4).join(", ")}`);
    }

    for (const kw of profile.keywords || []) {
        if (kw.length > 3 && hay.includes(kw.toLowerCase()) && !skillHits.some((s) => s.toLowerCase() === kw.toLowerCase())) {
            score += 2;
        }
    }

    const loc = locationMatches(job.location, preferredLocation, job.remote);
    score += loc.score;
    if (loc.reason) reasons.push(loc.reason);

    if (filter === "intern") {
        if (job.type === "intern" || /\b(intern|internship|trainee|apprentice|student|summer)\b/i.test(hay)) {
            score += 30;
            reasons.unshift("Internship match");
        }
    } else if (profile.seniority === "junior" || profile.seniority === "entry" || profile.seniority === "intern") {
        if (job.type === "intern" || /\b(fresher|entry|trainee|junior|0[\s-]?year)\b/i.test(hay)) {
            score += 10;
            reasons.push("Entry-level friendly");
        }
    }
    if (profile.seniority === "senior" && /\b(senior|staff|lead|principal|manager)\b/i.test(job.role)) {
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
    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`;
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

    const country = process.env.ADZUNA_COUNTRY || "in";

    const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "30",
        "content-type": "application/json",
    });
    if (query) params.set("what", query);
    const where = location && !location.toLowerCase().includes("remote") ? location : "";
    if (where) params.set("where", where);

    const url = `https://api.adzuna.com/v1/api/jobs/${country.toLowerCase()}/search/1?${params.toString()}`;
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
                source: country.toLowerCase() === "in" ? "Adzuna India" : `Adzuna (${country.toUpperCase()})`,
            };
        });
}

/**
 * Curated India-focused listings (Bangalore/Hyderabad heavy) used as a top-up when
 * live sources return too few results for an India-based preferred location.
 */
export const INDIA_FALLBACK_JOBS: Omit<MatchedJob, "matchPercent" | "matchReasons">[] = [
    {
        id: "job_in_google_intern",
        company: "Google India",
        role: "Software Engineering Intern",
        location: "Bangalore / Hyderabad",
        type: "intern",
        remote: false,
        tags: ["C++", "Java", "Python", "Data Structures", "Algorithms"],
        salaryRange: "₹80k–₹1.2L / month Stipend",
        description: "Join Google's engineering teams in Bangalore or Hyderabad as a software intern. Work on scalable distributed systems, developer tools, or AI services with 1-on-1 mentorship.",
        applyUrl: "https://careers.google.com/jobs/results/",
        postedAt: "2026-08-01",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_microsoft_intern",
        company: "Microsoft India",
        role: "Software Engineering Intern",
        location: "Hyderabad / Bangalore",
        type: "intern",
        remote: false,
        tags: ["Azure", "C#", "TypeScript", "Problem Solving"],
        salaryRange: "₹75k–₹1.1L / month Stipend",
        description: "Summer software engineering internship for college students and recent grads. Build high-impact cloud services, Teams features, and AI developer workflows.",
        applyUrl: "https://careers.microsoft.com/",
        postedAt: "2026-08-02",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_amazon_intern",
        company: "Amazon India",
        role: "SDE Intern (Campus & Off-Campus)",
        location: "Bangalore / Hyderabad",
        type: "intern",
        remote: false,
        tags: ["Java", "AWS", "DSA", "Distributed Systems"],
        salaryRange: "₹80k–₹1.1L / month Stipend",
        description: "Collaborate with senior AWS and retail service engineers to design and ship customer-facing features. Open to final-year students and fresh graduates.",
        applyUrl: "https://www.amazon.jobs/",
        postedAt: "2026-08-03",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_razorpay_intern",
        company: "Razorpay",
        role: "Full-Stack Engineering Intern",
        location: "Bangalore / Remote",
        type: "intern",
        remote: true,
        tags: ["React", "Node.js", "Payments", "Web APIs"],
        salaryRange: "₹45k–₹65k / month Stipend",
        description: "Work with modern React, Next.js, and Node.js microservices on India's premier payment gateway. Great learning curve for aspiring full-stack engineers.",
        applyUrl: "https://razorpay.com/jobs/",
        postedAt: "2026-08-05",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_swiggy_fresher",
        company: "Swiggy",
        role: "Associate Software Engineer (0-1 Year / Fresher)",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Java", "Golang", "Microservices", "Fresher"],
        salaryRange: "₹14L–₹20L",
        description: "Entry-level engineering role for freshers and 0-1 year developers. Build core ordering and delivery platform microservices serving millions of daily orders.",
        applyUrl: "https://careers.swiggy.com/",
        postedAt: "2026-08-04",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_flipkart_sde1",
        company: "Flipkart",
        role: "SDE 1 (1-2 Years Experience)",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Java", "Spring Boot", "Kafka", "MySQL"],
        salaryRange: "₹18L–₹26L",
        description: "High-scale backend engineering for early-career developers with 1-2 years experience. Work on inventory, cart, and high-concurrency checkout services.",
        applyUrl: "https://www.flipkartcareers.com/",
        postedAt: "2026-07-29",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_razorpay_be",
        company: "Razorpay",
        role: "Backend Engineer (1-3 Years Experience)",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Node.js", "Payments", "API", "TypeScript"],
        salaryRange: "₹18L–₹32L",
        description: "Build payment and banking infrastructure powering businesses across India with clean architecture and microservices.",
        applyUrl: "https://razorpay.com/jobs/",
        postedAt: "2026-07-28",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_cred_backend",
        company: "CRED",
        role: "Senior Backend Engineer (3+ Years)",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Golang", "Distributed Systems", "Kafka", "PostgreSQL"],
        salaryRange: "₹35L–₹60L",
        description: "Design high-reliability, low-latency financial service pipelines with 3+ years experience in distributed backend architectures.",
        applyUrl: "https://cred.club/careers",
        postedAt: "2026-08-02",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_remote_india_devrel",
        company: "Postman",
        role: "Developer Advocate (Remote India)",
        location: "Remote (India)",
        type: "full-time",
        remote: true,
        tags: ["API", "Community", "JavaScript", "TypeScript"],
        salaryRange: "₹18L–₹30L",
        description: "Fully remote position for engineers across India supporting the global API developer community with demos, tutorials, and developer tooling.",
        applyUrl: "https://www.postman.com/company/careers/",
        postedAt: "2026-07-30",
        source: "ProInterview curated (India)",
    },
];

/** Fetch live openings from public job boards and rank them against the resume profile. */
export async function searchMatchingJobs(
    profile: ResumeProfile,
    preferredLocation: string,
    filter?: string
): Promise<{ jobs: MatchedJob[]; sourcesTried: string[]; queries: string[] }> {
    const queries = buildSearchQueries(profile, preferredLocation, filter);
    const primary = queries[0] || profile.roles[0] || profile.careerDomain || "Professional";
    const sourcesTried: string[] = [];
    const collected: Omit<MatchedJob, "matchPercent" | "matchReasons">[] = [];

    // Adzuna query uses candidate's actual role and filter instead of hardcoded software
    const adzunaQuery = filter === "intern"
        ? `${profile.roles[0] || profile.careerDomain} Intern`
        : (profile.roles[0] || profile.careerDomain || "Jobs");

    const tasks: Array<{ name: string; run: () => Promise<Omit<MatchedJob, "matchPercent" | "matchReasons">[]> }> = [
        { name: "Remotive", run: () => fetchRemotive(primary) },
        { name: "Arbeitnow", run: () => fetchArbeitnow(primary) },
        { name: "RemoteOK", run: () => fetchRemoteOK(primary) },
        { name: "Adzuna India", run: () => fetchAdzunaIndia(adzunaQuery, preferredLocation) },
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

    // Deduplicate jobs by unique composite key and url
    const seen = new Set<string>();
    const deduplicated: Omit<MatchedJob, "matchPercent" | "matchReasons">[] = [];
    for (const job of collected) {
        if (!job.applyUrl) continue;
        const normKey = `${job.company.toLowerCase().trim()}::${job.role.toLowerCase().trim()}::${job.location.toLowerCase().trim()}`;
        const urlKey = job.applyUrl.toLowerCase().trim();
        if (seen.has(normKey) || seen.has(urlKey) || seen.has(job.id)) continue;
        seen.add(normKey);
        seen.add(urlKey);
        seen.add(job.id);
        deduplicated.push(job);
    }

    const ranked = deduplicated
        .map((job) => scoreJob(job, profile, preferredLocation, filter))
        .filter((j) => j.matchPercent >= 12)
        .sort((a, b) => b.matchPercent - a.matchPercent)
        .slice(0, 100);

    return { jobs: ranked, sourcesTried, queries };
}

export function webSearchUrls(profile: ResumeProfile, location: string): { label: string; url: string }[] {
    const target = profile.roles[0] || profile.careerDomain || "Jobs";
    const loc = location.trim();
    const q = encodeURIComponent([target, "jobs", loc].filter(Boolean).join(" "));
    return [
        { label: "Google Jobs search", url: `https://www.google.com/search?q=${q}` },
        {
            label: "LinkedIn Jobs search",
            url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(target)}&location=${encodeURIComponent(loc)}`,
        },
        {
            label: "RemoteOK search",
            url: `https://remoteok.com/remote-jobs?q=${encodeURIComponent(`${target} ${loc}`.trim())}`
        }
    ];
}
