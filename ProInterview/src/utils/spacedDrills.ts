export interface SpacedDrill {
    id: string;
    topic: string;
    reason: string;
    difficulty: "basic" | "intermediate" | "advanced";
    prompt: string;
    practiceType: "behavioral" | "technical" | "communication" | "coding";
    dueAt: number;
    sourceSessionAt?: number;
}

function inferTopicsFromSummary(
    summary: string,
    scores: { technical?: number; behavioral?: number; communication?: number }
): { topic: string; practiceType: SpacedDrill["practiceType"]; reason: string }[] {
    const out: { topic: string; practiceType: SpacedDrill["practiceType"]; reason: string }[] = [];
    const s = (summary || "").toLowerCase();

    if ((scores.technical ?? 100) < 70 || /algorithm|complexity|bug|incorrect|shallow tech|recursion/i.test(s)) {
        out.push({
            topic: /recursion/i.test(s) ? "Recursion & call stacks" : "Technical depth",
            practiceType: "technical",
            reason: /recursion/i.test(s)
                ? "Recursion came up as a weak spot across feedback."
                : "Technical score or feedback suggests weaker depth.",
        });
    }
    if ((scores.behavioral ?? 100) < 70 || /star|ownership|conflict|leadership|behavioral/i.test(s)) {
        out.push({
            topic: "Behavioral STAR stories",
            practiceType: "behavioral",
            reason: "Behavioral answers need tighter structure or stronger ownership.",
        });
    }
    if ((scores.communication ?? 100) < 70 || /unclear|rambl|filler|communica/i.test(s)) {
        out.push({
            topic: "Concise communication",
            practiceType: "communication",
            reason: "Communication clarity was a weak signal.",
        });
    }
    if (/system design|scalability|architecture/i.test(s)) {
        out.push({
            topic: "System design trade-offs",
            practiceType: "technical",
            reason: "Design/architecture came up as a gap.",
        });
    }
    if (/code|leetcode|bug|edge case/i.test(s)) {
        out.push({
            topic: "Coding edge cases",
            practiceType: "coding",
            reason: "Coding correctness or edge cases need reps.",
        });
    }
    return out;
}

const PROMPTS: Record<string, string> = {
    "Technical depth": "Explain a hard technical decision you made recently. Cover options, trade-offs, and what you would change.",
    "Recursion & call stacks": "Implement recursive tree traversal, then rewrite iteratively. Explain stack frames in 60 seconds.",
    "Behavioral STAR stories": "Using STAR, answer: Tell me about a time you disagreed with a teammate and how it resolved.",
    "Concise communication": "In under 60 seconds, summarize your strongest project for a hiring manager.",
    "System design trade-offs": "Design a URL shortener. Outline API, storage, and one scaling bottleneck.",
    "Coding edge cases": "Write a function to validate nested brackets. List 5 edge cases before coding.",
};

export function buildSpacedDrills(sessions: any[], now = Date.now()): SpacedDrill[] {
    if (!Array.isArray(sessions) || sessions.length === 0) return [];

    const recent = [...sessions]
        .filter((s) => s && typeof s.timestamp === "number")
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 12);

    const drills: SpacedDrill[] = [];
    const seen = new Set<string>();

    recent.forEach((session, idx) => {
        const topics = inferTopicsFromSummary(session.summary || session.transcript || "", {
            technical: session.technicalRating,
            behavioral: session.behavioralRating,
            communication: session.communicationRating,
        });

        const finalScore = typeof session.finalScore === "number" ? session.finalScore : 70;
        const baseDelayDays = finalScore < 55 ? 1 : finalScore < 70 ? 2 : 4;
        const dueAt = session.timestamp + (baseDelayDays + idx) * 24 * 60 * 60 * 1000;

        for (const t of topics) {
            if (seen.has(t.topic)) continue;
            seen.add(t.topic);
            drills.push({
                id: `drill_${t.topic.replace(/\s+/g, "_").toLowerCase()}_${session.timestamp}`,
                topic: t.topic,
                reason: t.reason,
                difficulty: finalScore < 55 ? "basic" : finalScore < 75 ? "intermediate" : "advanced",
                prompt: PROMPTS[t.topic] || `Practice: ${t.topic} (about 10 minutes)`,
                practiceType: t.practiceType,
                dueAt: Math.min(dueAt, now + 7 * 24 * 60 * 60 * 1000),
                sourceSessionAt: session.timestamp,
            });
        }
    });

    return drills.sort((a, b) => a.dueAt - b.dueAt).slice(0, 8);
}

export function drillsDue(drills: SpacedDrill[], now = Date.now()): SpacedDrill[] {
    return drills.filter((d) => d.dueAt <= now);
}
