const FALLBACK_QUESTIONS = [
    "Walk me through a project from your resume. What was your role, and what did you personally ship?",
    "How would you explain a REST API to a teammate who has never used one?",
    "Tell me about a bug that took longer than you expected. How did you find the root cause?",
    "What data structure would you use to detect duplicates in a large list, and why?",
    "Describe how you would design a login system for a campus placement portal.",
    "A teammate disagrees with your approach before a deadline. How do you handle that?",
    "What is the difference between a process and a thread, in plain language?",
    "If you had one week to prepare for this company's interview, what would you practice first?",
];

export function buildOfflineInterviewReply(opts: {
    historyLength?: number;
    company?: string;
    role?: string;
}): string {
    const idx = Math.max(0, Number(opts.historyLength) || 0) % FALLBACK_QUESTIONS.length;
    const company = opts.company || "the company";
    const role = opts.role || "this role";
    const prefix =
        idx === 0
            ? `Thanks for joining. This is an offline practice interviewer for ${role} at ${company}. `
            : "";
    return `[MODE:CHAT] ${prefix}${FALLBACK_QUESTIONS[idx]}`;
}
