/** Default public student community channels */
export const DEFAULT_COMMUNITY_CHANNELS = [
    {
        slug: "general",
        name: "General",
        description: "Say hi, share wins, and meet other students preparing for interviews.",
    },
    {
        slug: "interview-prep",
        name: "Interview Prep",
        description: "DSA, system design, and mock interview tips from peers.",
    },
    {
        slug: "college",
        name: "College & Campus",
        description: "On-campus drives, placements, and college-specific chat.",
    },
    {
        slug: "offers",
        name: "Offers & Negotiations",
        description: "Compare offers, ask about packages, and negotiation advice.",
    },
    {
        slug: "study-buddy",
        name: "Study Buddy",
        description: "Find a partner for pair practice and accountability.",
    },
] as const;

export function sanitizeChatBody(raw: string): string {
    return String(raw || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000);
}

export function dmSlug(a: string, b: string): string {
    const [x, y] = [a.trim().toLowerCase(), b.trim().toLowerCase()].sort();
    return `dm_${x}__${y}`.replace(/[^a-z0-9_@.-]/gi, "_").slice(0, 120);
}
