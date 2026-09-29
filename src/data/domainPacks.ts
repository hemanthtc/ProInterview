export type DomainId =
    | "backend"
    | "frontend"
    | "ml"
    | "devops"
    | "android"
    | "ios"
    | "data"
    | "security"
    | "vlsi"
    | "hardware_electrical"
    | "product"
    | "finance"
    | "marketing"
    | "hr";

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
    {
        id: "vlsi",
        name: "VLSI / Silicon Engineering",
        description: "RTL design, Verilog/SystemVerilog, synthesis, timing closure, and verification.",
        focusThemes: ["Static Timing Analysis (STA)", "Setup & Hold Margins", "CDC (Clock Domain Crossing)", "FSM Design", "Low-Power Synthesis"],
        signatureQuestions: [
            "Walk through resolving setup vs hold timing violations in a high-speed pipeline.",
            "Design a synchronizer circuit for multi-bit data crossing asynchronous clock domains.",
            "Explain clock gating and power gating trade-offs in sub-7nm silicon.",
        ],
        codingFlavors: ["Verilog/SystemVerilog testbenches", "FSM state transitions", "gate-level logic"],
        systemDesignPrompts: ["DMA Controller architecture", "Multi-core cache coherency interconnect", "AXI Bus crossbar switch"],
        behavioralThemes: ["Tape-out deadline pressure", "Post-silicon debugging collaboration", "Design review trade-offs"],
    },
    {
        id: "hardware_electrical",
        name: "Hardware & Electrical Systems",
        description: "Board design, power electronics, embedded microcontrollers, and signal integrity.",
        focusThemes: ["Power Supply / PMIC", "PCB Layout & EMI", "I2C/SPI/CAN Buses", "Thermal Management", "Sensor Interfacing"],
        signatureQuestions: [
            "How do you minimize high-frequency noise and ground loops in mixed-signal 4-layer PCB design?",
            "Calculate switching losses vs conduction losses in a synchronous buck converter.",
            "Debug an intermittent signal reflection issue on a high-speed differential bus.",
        ],
        codingFlavors: ["C/C++ firmware drivers", "register bitmasking", "DMA buffers"],
        systemDesignPrompts: ["Battery Management System (BMS)", "IoT industrial edge node", "Automotive motor drive ECU"],
        behavioralThemes: ["Cross-functional mechanical/firmware handoff", "Component obsolescence sourcing", "Safety compliance certifications"],
    },
    {
        id: "product",
        name: "Product Management",
        description: "User empathy, product discovery, PRD definition, roadmap prioritization, and metrics.",
        focusThemes: ["North Star Metric", "Go-To-Market (GTM)", "A/B Experimentation", "Stakeholder Alignment", "Unit Economics"],
        signatureQuestions: [
            "How would you improve retention for a two-sided delivery marketplace?",
            "Walk through defining and prioritizing features for a V1 product launch under tight engineering bandwidth.",
            "A key business metric dropped 12% week-over-week. How do you triage root causes?",
        ],
        codingFlavors: ["SQL funnel analysis", "metric formulas", "decision trees"],
        systemDesignPrompts: ["Self-serve onboarding flow", "Product referral & invite loop", "Freemium to paid conversion engine"],
        behavioralThemes: ["Pushing back on leadership requests", "Resolving engineer-designer disagreements", "Post-mortem on failed launches"],
    },
    {
        id: "finance",
        name: "Financial Analysis & Valuation",
        description: "DCF modeling, financial statement analysis, budgeting, and investment evaluation.",
        focusThemes: ["Three-Statement Modeling", "WACC & DCF Valuation", "Working Capital Optimization", "Variance Analysis", "Capital Budgeting"],
        signatureQuestions: [
            "Walk me through how a $10 increase in depreciation flows through the three financial statements.",
            "Explain the trade-offs between debt financing vs equity financing under high-interest-rate environments.",
            "How do you normalize EBITDA for a company with irregular capex and one-off restructuring charges?",
        ],
        codingFlavors: ["Excel financial functions", "DCF sensitivity tables", "scenario analysis"],
        systemDesignPrompts: ["Annual corporate budgeting model", "SaaS cohort LTV/CAC reporting model", "Merger financial synergy assessment"],
        behavioralThemes: ["Presenting financial bad news to leadership", "Navigating high-stakes audit scrutiny", "Cross-department budget negotiations"],
    },
    {
        id: "marketing",
        name: "Growth & Digital Marketing",
        description: "Customer acquisition, conversion rate optimization (CRO), attribution, and brand strategy.",
        focusThemes: ["CAC / LTV Economics", "Attribution Modeling", "Paid & Organic Funnels", "Audience Segmentation", "Retention Loops"],
        signatureQuestions: [
            "How do you structure an attribution model for an omnichannel product with a 45-day sales cycle?",
            "Design a paid acquisition growth campaign for a newly launched B2B SaaS tool with a $50k initial budget.",
            "Explain your process for diagnosing and fixing a high drop-off rate on a landing page.",
        ],
        codingFlavors: ["cohort retention curves", "ROAS calculations", "A/B sample size estimation"],
        systemDesignPrompts: ["Automated email drip onboarding funnel", "Affiliate partner commission system", "Multi-touch attribution pipeline"],
        behavioralThemes: ["Justifying ad spend to skeptical CFO", "Creative team vs performance marketing tension", "Pivoting after a flatlined campaign"],
    },
    {
        id: "hr",
        name: "Human Resources & Talent Management",
        description: "Talent acquisition, organizational development, employee retention, and workplace culture.",
        focusThemes: ["Competency Modeling", "Compensation & Banding", "Performance Reviews", "Conflict Resolution", "Retention & Culture"],
        signatureQuestions: [
            "How do you design an objective, fair performance evaluation rubric that minimizes reviewer bias?",
            "Walk through managing a high-stakes workplace conflict between a senior director and team members.",
            "What strategies would you employ to reduce 90-day new hire turnover in a fast-scaling company?",
        ],
        codingFlavors: ["eNPS score calculation", "compensation percentile formulas", "headcount planning models"],
        systemDesignPrompts: ["Company-wide 360 review cycle", "Standardized structured interview rubric", "Employee onboarding & mentorship journey"],
        behavioralThemes: ["Delivering executive termination / layoffs with dignity", "Handling sensitive ethics whistleblower reports", "Balancing employee welfare with corporate legal risks"],
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
