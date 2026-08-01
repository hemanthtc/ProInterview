const HAPPENSTANCE_API_BASE = "https://api.happenstance.ai/v1";

export type HappenstanceResearchStatus =
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "FAILED_AMBIGUOUS";

export interface HappenstanceProfile {
    person_metadata?: {
        full_name?: string | null;
        alternate_names?: string[] | null;
        profile_urls?: string[] | null;
        current_locations?: { location: string; comments?: string | null; urls?: string[] | null }[] | null;
        tagline?: string | null;
    } | null;
    employment?: {
        company_name?: string | null;
        job_title?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        description?: string | null;
        urls?: string[] | null;
    }[] | null;
    education?: {
        university_name?: string | null;
        degree?: string | null;
        description?: string | null;
    }[] | null;
    projects?: { title?: string | null; description?: string | null }[] | null;
    writings?: { title?: string | null; description?: string | null; date?: string | null }[] | null;
    hobbies?: { description?: string | null }[] | null;
    summary?: { text: string; urls?: string[] | null } | null;
}

export interface HappenstanceResearchResult {
    id: string;
    status: HappenstanceResearchStatus;
    query: string;
    created_at: string;
    updated_at: string;
    profile?: HappenstanceProfile | null;
    url?: string;
}

function getApiKey(): string | null {
    return process.env.HAPPENSTANCE_API_KEY?.replace(/"/g, "").trim() || null;
}

export function isHappenstanceConfigured(): boolean {
    return Boolean(getApiKey());
}

async function happenstanceFetch(path: string, init?: RequestInit) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("Missing HAPPENSTANCE_API_KEY environment variable");
    }

    const res = await fetch(`${HAPPENSTANCE_API_BASE}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = data?.detail || data?.title || `Happenstance request failed (${res.status})`;
        const error = new Error(detail) as Error & { status?: number; body?: unknown };
        error.status = res.status;
        error.body = data;
        throw error;
    }
    return data;
}

export function buildPersonDescription(input: {
    hrName: string;
    company?: string;
    role?: string;
    location?: string;
}): string {
    const parts = [input.hrName.trim()];
    if (input.company && input.company !== "Not specified") {
        parts.push(`at ${input.company.trim()}`);
    }
    if (input.role && input.role !== "Not specified") {
        parts.push(`hiring for ${input.role.trim()}`);
    }
    if (input.location && input.location !== "Not specified" && input.location.toLowerCase() !== "remote") {
        parts.push(`(${input.location.trim()})`);
    }
    parts.push("recruiter OR HR OR talent acquisition OR hiring manager");
    return parts.join(" ");
}

export async function createHappenstanceResearch(description: string): Promise<{ id: string; url: string }> {
    return happenstanceFetch("/research", {
        method: "POST",
        body: JSON.stringify({ description }),
    });
}

export async function getHappenstanceResearch(researchId: string): Promise<HappenstanceResearchResult> {
    return happenstanceFetch(`/research/${encodeURIComponent(researchId)}`);
}

/** Compact text blob for Gemini interview-intel prompts. */
export function profileToPromptContext(profile: HappenstanceProfile | null | undefined): string {
    if (!profile) return "No public profile data available.";

    const lines: string[] = [];
    const meta = profile.person_metadata;
    if (meta?.full_name) lines.push(`Name: ${meta.full_name}`);
    if (meta?.tagline) lines.push(`Tagline: ${meta.tagline}`);
    if (meta?.current_locations?.length) {
        lines.push(`Locations: ${meta.current_locations.map((l) => l.location).join("; ")}`);
    }
    if (meta?.profile_urls?.length) {
        lines.push(`Profiles: ${meta.profile_urls.slice(0, 5).join(", ")}`);
    }
    if (profile.summary?.text) {
        lines.push(`Summary:\n${profile.summary.text}`);
    }
    if (profile.employment?.length) {
        lines.push("Employment:");
        for (const job of profile.employment.slice(0, 6)) {
            lines.push(
                `- ${job.job_title || "Role"} @ ${job.company_name || "Company"} (${job.start_date || "?"}–${job.end_date || "present"})${job.description ? `: ${job.description}` : ""}`
            );
        }
    }
    if (profile.writings?.length) {
        lines.push("Public writings / posts / reviews signals:");
        for (const w of profile.writings.slice(0, 8)) {
            lines.push(`- ${w.title || "Untitled"}${w.date ? ` (${w.date})` : ""}${w.description ? `: ${w.description}` : ""}`);
        }
    }
    if (profile.projects?.length) {
        lines.push("Projects:");
        for (const p of profile.projects.slice(0, 5)) {
            lines.push(`- ${p.title || "Project"}${p.description ? `: ${p.description}` : ""}`);
        }
    }
    if (profile.hobbies?.length) {
        lines.push(`Interests: ${profile.hobbies.map((h) => h.description).filter(Boolean).join("; ")}`);
    }
    if (profile.education?.length) {
        lines.push(
            `Education: ${profile.education
                .map((e) => [e.degree, e.university_name].filter(Boolean).join(" @ "))
                .filter(Boolean)
                .join("; ")}`
        );
    }

    return lines.join("\n") || "Sparse profile — limited public information.";
}
