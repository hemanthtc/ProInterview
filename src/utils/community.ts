import crypto from "crypto";

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

const DEFAULT_SLUGS = new Set(DEFAULT_COMMUNITY_CHANNELS.map((c) => c.slug));

export function isDefaultChannelSlug(slug: string): boolean {
    return DEFAULT_SLUGS.has(slug as (typeof DEFAULT_COMMUNITY_CHANNELS)[number]["slug"]);
}

export function isDmSlug(slug: string): boolean {
    return String(slug || "").startsWith("dm_");
}

/** Opaque presence / sender key — never expose raw emails to other clients. */
export function presencePublicId(identifier: string): string {
    return crypto.createHash("sha256").update(String(identifier || "").trim().toLowerCase()).digest("hex").slice(0, 16);
}

export function sanitizeChatBody(raw: string): string {
    return String(raw || "")
        .replace(/<[^>]*>/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000);
}

export function sanitizeDisplayName(raw: string, fallback = "Student"): string {
    const cleaned = String(raw || "")
        .replace(/<[^>]*>/g, "")
        .replace(/[\u0000-\u001F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
    return cleaned || fallback;
}

export function dmSlug(a: string, b: string): string {
    const [x, y] = [a.trim().toLowerCase(), b.trim().toLowerCase()].sort();
    return `dm_${x}__${y}`.replace(/[^a-z0-9_@.-]/gi, "_").slice(0, 120);
}
