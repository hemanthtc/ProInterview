/** Curated company interview “clone” banks — style + likely themes for mock interviews. */

export interface CompanyBank {
    id: string;
    name: string;
    aliases: string[];
    culture: string;
    interviewerStyle: string;
    rounds: string[];
    signatureQuestions: string[];
    focusThemes: string[];
    codingFlavors: string[];
    tips: string[];
}

export const COMPANY_BANKS: CompanyBank[] = [
    {
        id: "google",
        name: "Google",
        aliases: ["google", "alphabet", "youtube", "gcp"],
        culture: "Googleyness — clarity, humility, intellectual curiosity, and structured thinking under ambiguity.",
        interviewerStyle: "Calm, precise, follows up on edge cases and trade-offs. Expects you to think aloud.",
        rounds: ["Phone screen", "Coding", "System design (L4+)", "Behavioral / Googleyness"],
        signatureQuestions: [
            "Design a URL shortener used by billions.",
            "Find the median of two sorted arrays.",
            "Tell me about a time you influenced without authority.",
            "How would you debug a latency spike in production?",
        ],
        focusThemes: ["Algorithms", "Scalability", "Clean communication", "Ownership"],
        codingFlavors: ["arrays/strings", "graphs", "dynamic programming", "concurrency concepts"],
        tips: ["State assumptions early", "Optimize after a correct brute force", "Ask clarifying questions"],
    },
    {
        id: "meta",
        name: "Meta",
        aliases: ["meta", "facebook", "instagram", "whatsapp"],
        culture: "Move fast with impact — metrics, product sense, and bold ownership.",
        interviewerStyle: "Direct and time-boxed. Pushes for concrete impact numbers and product judgment.",
        rounds: ["Coding", "System design", "Behavioral (impact)", "Product sense (some roles)"],
        signatureQuestions: [
            "Design Instagram Stories feed ranking.",
            "Given a social graph, find mutual friends efficiently.",
            "Tell me about the highest-impact project you shipped.",
            "How do you prioritize when everything is P0?",
        ],
        focusThemes: ["Impact metrics", "Product trade-offs", "Graph problems", "Speed of execution"],
        codingFlavors: ["graphs", "heaps", "sliding window", "API design"],
        tips: ["Lead with impact (users, latency, revenue)", "Be decisive", "Show bias to ship"],
    },
    {
        id: "amazon",
        name: "Amazon",
        aliases: ["amazon", "aws", "amazon web services"],
        culture: "Leadership Principles — Customer Obsession, Ownership, Dive Deep, Bias for Action.",
        interviewerStyle: "STAR-heavy. Will dig multiple layers into each story against Leadership Principles.",
        rounds: ["Online assessment", "Technical phone", "Loop (LP + coding/design)"],
        signatureQuestions: [
            "Tell me about a time you disagreed with your manager (Have Backbone).",
            "Design an order fulfillment service for Prime Day.",
            "Describe a time you delivered under a tight deadline (Bias for Action).",
            "How would you handle a cascading failure in a checkout service?",
        ],
        focusThemes: ["Leadership Principles", "Operational excellence", "Customer metrics", "Dive Deep"],
        codingFlavors: ["OOP design", "trees", "hash maps", "concurrency"],
        tips: ["Prepare 2 STAR stories per LP", "Quantify customer impact", "Admit data gaps then Dive Deep"],
    },
    {
        id: "microsoft",
        name: "Microsoft",
        aliases: ["microsoft", "azure", "github"],
        culture: "Growth mindset, collaboration, and inclusive engineering.",
        interviewerStyle: "Collaborative. Values clarity, testing mindset, and how you work with others.",
        rounds: ["Coding", "System design", "Behavioral", "As-appropriate"],
        signatureQuestions: [
            "Design OneDrive sync conflict resolution.",
            "Implement an LRU cache.",
            "Tell me about mentoring or elevating a teammate.",
            "How do you ensure quality without slowing delivery?",
        ],
        focusThemes: ["Collaboration", "Testing", "Cloud services", "Inclusive leadership"],
        codingFlavors: ["data structures", "API design", "debugging", "OOP"],
        tips: ["Show growth from failure", "Discuss testing strategy", "Be a partner, not a lone wolf"],
    },
    {
        id: "stripe",
        name: "Stripe",
        aliases: ["stripe"],
        culture: "Operators who write — precision, API craftsmanship, and user empathy for developers.",
        interviewerStyle: "Extremely detail-oriented. Expects clean APIs, edge cases, and written clarity.",
        rounds: ["Coding", "Integration / bug squash", "System design", "Behavioral"],
        signatureQuestions: [
            "Design an idempotent payments API.",
            "How would you model refunds and partial captures?",
            "Debug a flaky webhook delivery system.",
            "Write a clear design doc outline for a new billing feature.",
        ],
        focusThemes: ["API design", "Idempotency", "Reliability", "Developer experience"],
        codingFlavors: ["state machines", "parsing", "concurrency", "HTTP semantics"],
        tips: ["Name things carefully", "Call out failure modes", "Think like an API consumer"],
    },
    {
        id: "netflix",
        name: "Netflix",
        aliases: ["netflix"],
        culture: "Freedom & responsibility — high talent density, candor, and context not control.",
        interviewerStyle: "Candid and senior. Probes judgment, ownership, and system thinking at scale.",
        rounds: ["Coding", "System design", "Behavioral / culture"],
        signatureQuestions: [
            "Design a global video streaming CDN strategy.",
            "How do you handle chaos engineering for playback?",
            "Tell me about a time you gave hard feedback.",
            "What would you deprecate on your last team and why?",
        ],
        focusThemes: ["Scale", "Judgment", "Candor", "Operational maturity"],
        codingFlavors: ["distributed systems", "caching", "performance"],
        tips: ["Be direct", "Own outcomes end-to-end", "Discuss trade-offs without fluff"],
    },
    {
        id: "apple",
        name: "Apple",
        aliases: ["apple"],
        culture: "Privacy, craft, and obsessive product quality.",
        interviewerStyle: "Quietly rigorous. Values depth, polish, and thoughtful silence over buzzwords.",
        rounds: ["Coding", "Domain deep-dive", "Behavioral"],
        signatureQuestions: [
            "How would you design a privacy-preserving analytics pipeline?",
            "Optimize battery usage for a background sync feature.",
            "Tell me about a time you pushed for quality under schedule pressure.",
            "Walk through memory management concerns in your stack.",
        ],
        focusThemes: ["Privacy", "Performance", "Craftsmanship", "User trust"],
        codingFlavors: ["low-level awareness", "algorithms", "systems"],
        tips: ["Prefer substance over hype", "Discuss privacy implications", "Show taste in trade-offs"],
    },
    {
        id: "uber",
        name: "Uber",
        aliases: ["uber"],
        culture: "City-scale systems, marketplace dynamics, and pragmatic engineering.",
        interviewerStyle: "Practical and scenario-heavy. Likes real-time systems and messy constraints.",
        rounds: ["Coding", "System design", "Behavioral"],
        signatureQuestions: [
            "Design a real-time driver-rider matching system.",
            "How do you handle surge pricing fairness?",
            "Tell me about operating through an incident.",
            "Model ETA prediction trade-offs.",
        ],
        focusThemes: ["Marketplaces", "Geo/realtime", "Reliability", "Ambiguity"],
        codingFlavors: ["heaps", "graphs", "streaming", "geo indexes"],
        tips: ["Embrace messy constraints", "Talk about SLAs", "Show incident ownership"],
    },
    {
        id: "salesforce",
        name: "Salesforce",
        aliases: ["salesforce", "slack"],
        culture: "Ohana — trust, customer success, and inclusive collaboration.",
        interviewerStyle: "Warm but structured. Values enterprise thinking and stakeholder communication.",
        rounds: ["Coding", "Design", "Behavioral"],
        signatureQuestions: [
            "Design a multi-tenant metadata platform.",
            "How do you migrate customers with zero downtime?",
            "Tell me about aligning engineering with customer success.",
            "Explain a complex system to a non-technical stakeholder.",
        ],
        focusThemes: ["Multi-tenancy", "Enterprise reliability", "Communication", "Trust"],
        codingFlavors: ["OOP", "APIs", "data modeling"],
        tips: ["Customer language matters", "Discuss migration/risk", "Show inclusive leadership"],
    },
    {
        id: "generic-faang",
        name: "Top Tech (generic)",
        aliases: ["faang", "mavang", "big tech"],
        culture: "High bar for problem solving, communication, and ownership.",
        interviewerStyle: "Structured, follow-up heavy, expects clear problem solving narration.",
        rounds: ["Coding", "System design", "Behavioral"],
        signatureQuestions: [
            "Solve a medium-hard algorithmic problem while thinking aloud.",
            "Design a chat system for millions of users.",
            "Tell me about a conflict on your team and how you resolved it.",
            "What is a technical decision you would reverse?",
        ],
        focusThemes: ["Problem solving", "Communication", "Ownership", "Design basics"],
        codingFlavors: ["arrays", "trees", "graphs", "DP"],
        tips: ["Clarify → brute force → optimize", "Use STAR for behavioral", "Ask about success metrics"],
    },
];

export function resolveCompanyBank(companyName?: string | null): CompanyBank | null {
    if (!companyName) return null;
    const raw = companyName.toLowerCase();
    const tokens = raw.split(/[,&/|]+/).map((t) => t.trim()).filter(Boolean);
    for (const token of tokens) {
        const hit = COMPANY_BANKS.find(
            (b) =>
                b.name.toLowerCase() === token ||
                b.aliases.some((a) => token.includes(a) || a.includes(token))
        );
        if (hit) return hit;
    }
    return null;
}

export function companyBankPromptBlock(bank: CompanyBank): string {
    return `COMPANY CLONE MODE — Interview as if hiring for ${bank.name}.
Culture: ${bank.culture}
Interviewer style: ${bank.interviewerStyle}
Typical rounds: ${bank.rounds.join(" → ")}
Focus themes: ${bank.focusThemes.join(", ")}
Coding flavors to prefer: ${bank.codingFlavors.join(", ")}
Example signature questions (adapt, do not recite verbatim every time):
${bank.signatureQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
Coach-aligned tips the candidate may know: ${bank.tips.join("; ")}
Stay in character for ${bank.name}'s hiring bar and vocabulary.`;
}
