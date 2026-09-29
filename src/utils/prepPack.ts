export interface PrepPack {
    id: string;
    createdAt: number;
    company: string;
    role: string;
    hrName?: string;
    interviewDate?: string;
    interviewAt?: number | null;
    platform?: string;
    /** Google Meet / Zoom deep link extracted from invite */
    meetingUrl?: string;
    skills: string[];
    checklist: { id: string; label: string; done: boolean }[];
    reminders: { id: string; label: string; at: number; fired?: boolean }[];
    hrIntelSummary?: string;
    source: "email" | "manual";
}

function parseLooseDate(raw?: string): number | null {
    if (!raw || raw === "Not specified") return null;
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) return t;
    const withYear = Date.parse(`${raw} ${new Date().getFullYear()}`);
    if (!Number.isNaN(withYear)) return withYear;
    return null;
}

/** Pull Google Meet / Zoom / Teams links from invite text */
export function extractMeetingUrl(text?: string): string | undefined {
    if (!text) return undefined;
    const match = text.match(
        /https?:\/\/(?:meet\.google\.com|zoom\.us\/j|teams\.microsoft\.com\/l\/meetup)[^\s<>"']+/i
    );
    return match?.[0];
}

export function buildPrepPackFromEmail(input: {
    company?: string;
    role?: string;
    hrName?: string;
    interviewDate?: string;
    platform?: string;
    meetingUrl?: string;
    skills?: string[];
    mandatoryThings?: string[] | string;
    importantPoints?: string[] | string;
    hrIntelSummary?: string;
}): PrepPack {
    const interviewAt = parseLooseDate(input.interviewDate);
    const now = Date.now();
    const id = `prep_${now}`;

    const checklist: PrepPack["checklist"] = [
        { id: "c1", label: `Research ${input.company || "the company"} (product, news, eng blog)`, done: false },
        { id: "c2", label: `Prep 3 STAR stories mapped to ${input.role || "the role"}`, done: false },
        { id: "c3", label: "Rehearse a 60-second pitch of your background", done: false },
        { id: "c4", label: "Test camera, mic, and meeting link", done: false },
        { id: "c5", label: "Prepare 3 smart questions for the interviewer", done: false },
        { id: "c6", label: "Run a 15-min mini mock interview in ProInterview", done: false },
    ];

    if (input.hrName && input.hrName !== "Not specified") {
        checklist.push({
            id: "c7",
            label: `Review Happenstance intel for ${input.hrName} (tone + likely questions)`,
            done: false,
        });
    }

    const mandatory = Array.isArray(input.mandatoryThings)
        ? input.mandatoryThings
        : typeof input.mandatoryThings === "string"
          ? input.mandatoryThings.split("\n")
          : [];
    mandatory.slice(0, 6).forEach((item, i) => {
        const label = String(item).replace(/^-\s*\[[ xX]\]\s*/, "").trim();
        if (label) checklist.push({ id: `m${i}`, label, done: false });
    });

    const reminders: PrepPack["reminders"] = [];
    if (interviewAt && interviewAt > now) {
        const offsets: [string, number][] = [
            ["48h prep checkpoint", 48 * 3600 * 1000],
            ["24h review + mini mock", 24 * 3600 * 1000],
            ["1h final gear check", 1 * 3600 * 1000],
        ];
        for (const [label, ms] of offsets) {
            const at = interviewAt - ms;
            if (at > now) reminders.push({ id: `r_${ms}`, label, at });
        }
    } else {
        reminders.push(
            { id: "r_today", label: "Today: skim company + role JD", at: now + 2 * 3600 * 1000 },
            { id: "r_tomorrow", label: "Tomorrow: run a 15-min mini mock", at: now + 24 * 3600 * 1000 }
        );
    }

    return {
        id,
        createdAt: now,
        company: input.company || "Target Company",
        role: input.role || "Target Role",
        hrName: input.hrName,
        interviewDate: input.interviewDate,
        interviewAt,
        platform: input.platform,
        meetingUrl: input.meetingUrl,
        skills: input.skills || [],
        checklist,
        reminders,
        hrIntelSummary: input.hrIntelSummary,
        source: "email",
    };
}
