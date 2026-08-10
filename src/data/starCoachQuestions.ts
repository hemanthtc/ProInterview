export type StarQuestionCategory =
    | "conflict"
    | "leadership"
    | "failure"
    | "teamwork"
    | "deadline"
    | "influence"
    | "customer"
    | "mixed";

export interface StarCoachQuestion {
    id: string;
    question: string;
    category: StarQuestionCategory;
    focus: string;
    suggestedWeakSpot: string;
    hint?: string;
}

export const STAR_CATEGORY_LABELS: Record<StarQuestionCategory, string> = {
    conflict: "Conflict & disagreement",
    leadership: "Leadership & ownership",
    failure: "Failure & learning",
    teamwork: "Teamwork & collaboration",
    deadline: "Pressure & deadlines",
    influence: "Influence without authority",
    customer: "Customer & stakeholder focus",
    mixed: "Mixed / interview-style",
};

/** Curated seed bank when online generation is unavailable. */
export const STAR_SEED_QUESTIONS: StarCoachQuestion[] = [
    {
        id: "seed-conflict-1",
        question: "Tell me about a time you disagreed with a teammate. How did you handle it?",
        category: "conflict",
        focus: "Professional disagreement, data vs opinion, resolution",
        suggestedWeakSpot: "Show your specific actions, not only that 'we talked it out'",
    },
    {
        id: "seed-conflict-2",
        question: "Describe a situation where you had to push back on your manager.",
        category: "conflict",
        focus: "Respectful dissent, backing claims with evidence",
        suggestedWeakSpot: "Avoid sounding defensive — end with a positive team outcome",
    },
    {
        id: "seed-lead-1",
        question: "Tell me about a time you took ownership of something outside your job description.",
        category: "leadership",
        focus: "Initiative, scope expansion, accountability",
        suggestedWeakSpot: "Quantify the result — latency, revenue, users, or hours saved",
    },
    {
        id: "seed-lead-2",
        question: "Give an example of when you mentored or elevated someone on your team.",
        category: "leadership",
        focus: "Coaching, feedback, measurable growth in others",
        suggestedWeakSpot: "Name concrete behaviors you changed in the mentee",
    },
    {
        id: "seed-fail-1",
        question: "Tell me about a project that failed or missed its goal. What did you learn?",
        category: "failure",
        focus: "Accountability, reflection, process improvements",
        suggestedWeakSpot: "Own your part; avoid blaming others or vague lessons",
    },
    {
        id: "seed-fail-2",
        question: "Describe a time you made a mistake in production. What happened next?",
        category: "failure",
        focus: "Incident response, communication, prevention",
        suggestedWeakSpot: "Include detection, mitigation, and a follow-up fix",
    },
    {
        id: "seed-team-1",
        question: "Tell me about a time you worked with a difficult stakeholder.",
        category: "teamwork",
        focus: "Empathy, alignment, communication cadence",
        suggestedWeakSpot: "Use 'I' for your actions; don't hide behind 'we'",
    },
    {
        id: "seed-team-2",
        question: "Describe how you helped unblock a team that was stuck.",
        category: "teamwork",
        focus: "Cross-functional help, removing bottlenecks",
        suggestedWeakSpot: "Explain why they were stuck and what you specifically did",
    },
    {
        id: "seed-deadline-1",
        question: "Tell me about a time you had to deliver under a tight deadline.",
        category: "deadline",
        focus: "Prioritization, trade-offs, quality vs speed",
        suggestedWeakSpot: "State what you cut, what you kept, and the measurable outcome",
    },
    {
        id: "seed-deadline-2",
        question: "Describe a time you had too many priorities. How did you decide what to do first?",
        category: "deadline",
        focus: "Prioritization framework, stakeholder negotiation",
        suggestedWeakSpot: "Show explicit criteria (impact, risk, dependencies)",
    },
    {
        id: "seed-influence-1",
        question: "Tell me about a time you influenced a decision without formal authority.",
        category: "influence",
        focus: "Data, prototypes, coalition building",
        suggestedWeakSpot: "Clarify who you convinced and what changed because of you",
    },
    {
        id: "seed-influence-2",
        question: "Give an example of when you changed someone's mind on a technical approach.",
        category: "influence",
        focus: "Technical persuasion, experiments, risk framing",
        suggestedWeakSpot: "Compare alternatives and why your approach won",
    },
    {
        id: "seed-customer-1",
        question: "Tell me about a time you went above and beyond for a customer or user.",
        category: "customer",
        focus: "User empathy, measurable satisfaction or retention",
        suggestedWeakSpot: "Tie actions to a user/business metric",
    },
    {
        id: "seed-customer-2",
        question: "Describe a time you received harsh feedback from a customer. How did you respond?",
        category: "customer",
        focus: "Composure, root cause, follow-through",
        suggestedWeakSpot: "Show emotional control and a concrete remediation plan",
    },
    {
        id: "seed-mixed-1",
        question: "Tell me about the highest-impact project you've shipped.",
        category: "mixed",
        focus: "Scope, your role, metrics, trade-offs",
        suggestedWeakSpot: "Lead with impact numbers in the first 15 seconds",
    },
    {
        id: "seed-mixed-2",
        question: "Describe a time you had to learn something new quickly to deliver on a commitment.",
        category: "mixed",
        focus: "Learning speed, applying knowledge under pressure",
        suggestedWeakSpot: "Explain how you validated you learned enough to ship safely",
    },
];

export function shuffleStarQuestions(
    pool: StarCoachQuestion[],
    count: number,
    category?: StarQuestionCategory
): StarCoachQuestion[] {
    const filtered =
        category && category !== "mixed"
            ? pool.filter((q) => q.category === category)
            : [...pool];
    const source = filtered.length > 0 ? filtered : [...pool];
    const shuffled = [...source];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}

export function normalizeGeneratedStarQuestions(raw: unknown, fallbackCount = 1): StarCoachQuestion[] {
    const arr = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object" && Array.isArray((raw as { questions?: unknown }).questions)
          ? (raw as { questions: unknown[] }).questions
          : [];

    const validCategories = new Set(Object.keys(STAR_CATEGORY_LABELS));
    const out: StarCoachQuestion[] = [];

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== "object") continue;
        const q = item as Record<string, unknown>;
        const question = String(q.question || q.prompt || "").trim();
        if (!question) continue;
        const catRaw = String(q.category || "mixed").toLowerCase();
        const category = validCategories.has(catRaw) ? (catRaw as StarQuestionCategory) : "mixed";
        out.push({
            id: String(q.id || `star-online-${Date.now()}-${i}`),
            question,
            category,
            focus: String(q.focus || q.theme || "Behavioral depth and STAR structure"),
            suggestedWeakSpot: String(
                q.suggestedWeakSpot || q.weakSpot || "Add measurable impact and clear personal actions"
            ),
            hint: q.hint ? String(q.hint) : undefined,
        });
    }

    if (out.length === 0) {
        return shuffleStarQuestions(STAR_SEED_QUESTIONS, fallbackCount);
    }
    return out;
}
