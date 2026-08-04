export type DomainId =
    | "backend"
    | "frontend"
    | "ml"
    | "devops"
    | "android"
    | "ios"
    | "data"
    | "security";

export interface DomainPack {
    id: DomainId;
    name: string;
    description: string;
    focusThemes: string[];
    signatureQuestions: string[];
    codingFlavors: string[];
    systemDesignPrompts: string[];
    behavioralThemes: string[];
}

export const DOMAIN_PACKS: DomainPack[] = [
    {
        id: "backend",
        name: "Backend / APIs",
        description: "Distributed systems, APIs, databases, and reliability.",
        focusThemes: ["API design", "Consistency models", "Caching", "Queues", "Observability"],
        signatureQuestions: [
            "Design a rate limiter for a public API.",
            "How would you migrate a monolith to services with zero downtime?",
            "Walk through idempotency for payment webhooks.",
        ],
        codingFlavors: ["graphs", "concurrency", "SQL", "caching"],
        systemDesignPrompts: ["URL shortener", "Notification service", "Multi-tenant auth"],
        behavioralThemes: ["On-call ownership", "Incident response", "Cross-team API contracts"],
    },
    {
        id: "frontend",
        name: "Frontend / Web",
        description: "React performance, accessibility, and product UI craft.",
        focusThemes: ["Rendering performance", "State management", "A11y", "Design systems"],
        signatureQuestions: [
            "How do you diagnose and fix a React re-render storm?",
            "Design a virtualized infinite feed.",
            "Explain your approach to accessible forms and focus management.",
        ],
        codingFlavors: ["DOM algorithms", "trees", "async UX", "CSS layout"],
        systemDesignPrompts: ["Design system package", "Real-time collaborative editor UI"],
        behavioralThemes: ["Design collaboration", "Shipping polished UX under deadlines"],
    },
    {
        id: "ml",
        name: "ML / AI Engineering",
        description: "Model lifecycle, evaluation, RAG, and production ML.",
        focusThemes: ["Evaluation", "Feature pipelines", "Latency/cost", "Safety"],
        signatureQuestions: [
            "How would you evaluate a RAG chatbot in production?",
            "Design an online learning loop for ranking.",
            "Trade-offs between fine-tuning and prompt orchestration?",
        ],
        codingFlavors: ["numpy-style logic", "metrics", "pipelines"],
        systemDesignPrompts: ["Feature store", "Model serving platform", "Content moderation pipeline"],
        behavioralThemes: ["Communicating uncertainty", "Partnering with PMs on metrics"],
    },
    {
        id: "devops",
        name: "DevOps / Platform",
        description: "CI/CD, Kubernetes, infra-as-code, and SLO culture.",
        focusThemes: ["Deploy safety", "Autoscaling", "Secrets", "Cost control"],
        signatureQuestions: [
            "Design a blue/green deploy for a stateful service.",
            "How do you define SLOs and error budgets?",
            "Debug a cluster-wide CPU spike.",
        ],
        codingFlavors: ["scripting", "graphs", "scheduling"],
        systemDesignPrompts: ["CI platform", "Multi-region failover", "Internal developer portal"],
        behavioralThemes: ["Enabling teams", "Change management", "Blameless postmortems"],
    },
    {
        id: "android",
        name: "Android",
        description: "Kotlin, Jetpack, offline-first, and Play-quality apps.",
        focusThemes: ["Architecture", "Lifecycle", "Offline sync", "Performance"],
        signatureQuestions: [
            "Design offline-first sync for a notes app.",
            "How do you structure a multi-module Android app?",
            "Debug ANRs and memory leaks.",
        ],
        codingFlavors: ["Kotlin coroutines", "graphs", "caching"],
        systemDesignPrompts: ["Push notification fanout on mobile", "Media upload pipeline"],
        behavioralThemes: ["Shipping Play releases", "Working with design on motion"],
    },
    {
        id: "ios",
        name: "iOS",
        description: "SwiftUI/UIKit, concurrency, and App Store readiness.",
        focusThemes: ["Swift concurrency", "App architecture", "Privacy", "Perf"],
        signatureQuestions: [
            "Compare SwiftUI and UIKit for a complex form flow.",
            "Design background refresh for messaging.",
            "How do you handle App Tracking Transparency + analytics?",
        ],
        codingFlavors: ["Swift algorithms", "trees", "async"],
        systemDesignPrompts: ["Offline map caching", "End-to-end encrypted chat client"],
        behavioralThemes: ["App Store review crises", "Pairing with backend on contracts"],
    },
    {
        id: "data",
        name: "Data Engineering",
        description: "Pipelines, warehousing, quality, and batch/stream tradeoffs.",
        focusThemes: ["ETL/ELT", "Data quality", "Lakehouse", "Streaming"],
        signatureQuestions: [
            "Design a late-arriving event pipeline.",
            "How do you enforce data contracts across teams?",
            "Compare Kafka vs pub/sub for clickstream.",
        ],
        codingFlavors: ["SQL", "windowing", "joins"],
        systemDesignPrompts: ["Real-time analytics warehouse", "CDC from OLTP to lake"],
        behavioralThemes: ["Stakeholder prioritization", "Data incident communication"],
    },
    {
        id: "security",
        name: "Security Engineering",
        description: "AppSec, identity, threat modeling, and secure SDLC.",
        focusThemes: ["AuthN/Z", "Threat models", "Secrets", "Supply chain"],
        signatureQuestions: [
            "Threat-model a multi-tenant SaaS admin panel.",
            "Design OAuth for first-party + third-party clients.",
            "How do you roll credentials after a leak?",
        ],
        codingFlavors: ["crypto primitives concepts", "graphs", "policy engines"],
        systemDesignPrompts: ["Central identity platform", "Secrets rotation service"],
        behavioralThemes: ["Saying no constructively", "Security vs velocity tradeoffs"],
    },
];

export function resolveDomainPack(idOrName?: string): DomainPack | null {
    if (!idOrName) return null;
    const q = idOrName.trim().toLowerCase();
    return (
        DOMAIN_PACKS.find((d) => d.id === q || d.name.toLowerCase() === q) ||
        DOMAIN_PACKS.find((d) => d.name.toLowerCase().includes(q)) ||
        null
    );
}

export function domainPackPromptBlock(pack: DomainPack): string {
    return `DOMAIN PACK: ${pack.name}
Focus: ${pack.focusThemes.join(", ")}
Likely questions: ${pack.signatureQuestions.join(" | ")}
Coding flavors: ${pack.codingFlavors.join(", ")}
System design prompts: ${pack.systemDesignPrompts.join(" | ")}
Behavioral themes: ${pack.behavioralThemes.join(", ")}`;
}
