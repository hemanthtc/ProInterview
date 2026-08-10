export type SystemDesignDifficulty = "easy" | "medium" | "hard";

export interface SystemDesignQuestion {
    id: string;
    title: string;
    prompt: string;
    difficulty: SystemDesignDifficulty;
    topics: string[];
    constraints: string[];
    focusAreas: string[];
}

/** Curated seed bank used only when the online generator is unavailable. */
export const SYSTEM_DESIGN_SEED_QUESTIONS: SystemDesignQuestion[] = [
    {
        id: "seed-url-shortener",
        title: "URL Shortener",
        prompt: "Design a URL shortener used by 100M DAU with custom aliases and analytics.",
        difficulty: "medium",
        topics: ["hashing", "caching", "read-heavy"],
        constraints: ["100M DAU", "custom aliases", "click analytics"],
        focusAreas: ["API design", "storage", "caching", "ID generation"],
    },
    {
        id: "seed-ride-sharing",
        title: "Ride-sharing Dispatch",
        prompt: "Design a ride-sharing dispatch system that matches riders and drivers in real time.",
        difficulty: "hard",
        topics: ["geo", "matching", "realtime"],
        constraints: ["city-scale traffic", "ETA accuracy", "surge pricing"],
        focusAreas: ["geo indexing", "matching algorithms", "consistency"],
    },
    {
        id: "seed-notifications",
        title: "Notification Service",
        prompt: "Design a multi-channel notification service (push, email, SMS) with retries and preferences.",
        difficulty: "medium",
        topics: ["queues", "fanout", "reliability"],
        constraints: ["multi-channel", "user preferences", "at-least-once delivery"],
        focusAreas: ["queues", "templates", "rate limits", "dedup"],
    },
    {
        id: "seed-feature-flags",
        title: "Feature-flag Platform",
        prompt: "Design a multi-tenant feature-flag platform with targeting rules and gradual rollouts.",
        difficulty: "medium",
        topics: ["multi-tenant", "config", "rollouts"],
        constraints: ["low-latency evaluation", "tenants", "percentage rollouts"],
        focusAreas: ["SDK design", "rule engine", "caching"],
    },
    {
        id: "seed-chat",
        title: "Real-time Chat",
        prompt: "Design a WhatsApp-like messaging system supporting 1:1 and group chats with read receipts.",
        difficulty: "hard",
        topics: ["websockets", "fanout", "storage"],
        constraints: ["global users", "offline sync", "media messages"],
        focusAreas: ["message delivery", "presence", "storage partitioning"],
    },
    {
        id: "seed-newsfeed",
        title: "News Feed",
        prompt: "Design a social news feed that supports follows, ranking, and near-real-time updates.",
        difficulty: "hard",
        topics: ["fanout", "ranking", "caching"],
        constraints: ["celebrity users", "personalized ranking", "media"],
        focusAreas: ["push vs pull", "ranking", "CDN"],
    },
    {
        id: "seed-rate-limiter",
        title: "Distributed Rate Limiter",
        prompt: "Design a distributed rate limiter used by an API gateway serving thousands of services.",
        difficulty: "medium",
        topics: ["redis", "algorithms", "gateway"],
        constraints: ["per-user and per-API limits", "multi-region"],
        focusAreas: ["token bucket", "consistency", "hot keys"],
    },
    {
        id: "seed-search",
        title: "Typeahead Search",
        prompt: "Design a typeahead / autocomplete service for an e-commerce catalog.",
        difficulty: "medium",
        topics: ["search", "caching", "prefix"],
        constraints: ["sub-100ms p99", "typo tolerance", "personalization"],
        focusAreas: ["tries", "ranking", "cache tiers"],
    },
    {
        id: "seed-video",
        title: "Video Streaming",
        prompt: "Design a YouTube-like video streaming platform with upload, processing, and playback.",
        difficulty: "hard",
        topics: ["cdn", "encoding", "storage"],
        constraints: ["adaptive bitrate", "global viewers", "comments"],
        focusAreas: ["transcoding pipeline", "CDN", "metadata store"],
    },
    {
        id: "seed-ticket",
        title: "Ticket Booking",
        prompt: "Design a concert ticket booking system that prevents double-booking under flash sales.",
        difficulty: "hard",
        topics: ["inventory", "locking", "payments"],
        constraints: ["flash sales", "seat maps", "payment timeouts"],
        focusAreas: ["reservation holds", "idempotency", "consistency"],
    },
    {
        id: "seed-metrics",
        title: "Metrics / Observability",
        prompt: "Design a metrics ingestion and querying system for millions of time-series streams.",
        difficulty: "hard",
        topics: ["timeseries", "ingestion", "query"],
        constraints: ["high write QPS", "downsampling", "alerting"],
        focusAreas: ["storage format", "aggregation", "cardinality"],
    },
    {
        id: "seed-pastebin",
        title: "Pastebin",
        prompt: "Design a Pastebin-like service with expiration, privacy settings, and syntax highlighting.",
        difficulty: "easy",
        topics: ["storage", "cdn", "ttl"],
        constraints: ["public/private pastes", "TTL", "abuse prevention"],
        focusAreas: ["object storage", "rate limits", "URLs"],
    },
    {
        id: "seed-uber-eta",
        title: "ETA Service",
        prompt: "Design an ETA estimation service for delivery / rides that updates as traffic changes.",
        difficulty: "hard",
        topics: ["ml", "geo", "streaming"],
        constraints: ["fresh traffic data", "mobile clients", "accuracy SLAs"],
        focusAreas: ["feature pipelines", "map matching", "caching"],
    },
    {
        id: "seed-file-sync",
        title: "Cloud File Sync",
        prompt: "Design a Dropbox-like file sync system with multi-device consistency and sharing.",
        difficulty: "hard",
        topics: ["sync", "conflict", "storage"],
        constraints: ["large files", "offline edits", "ACL sharing"],
        focusAreas: ["chunking", "conflict resolution", "metadata"],
    },
    {
        id: "seed-ad-click",
        title: "Ad Click Aggregator",
        prompt: "Design an ad click aggregation pipeline that produces near-real-time dashboards.",
        difficulty: "medium",
        topics: ["streaming", "aggregation", "exactly-once"],
        constraints: ["billions of events/day", "late data", "fraud filters"],
        focusAreas: ["stream processing", "windowing", "storage"],
    },
    {
        id: "seed-key-value",
        title: "Distributed Key-Value Store",
        prompt: "Design a distributed key-value store with replication and tunable consistency.",
        difficulty: "hard",
        topics: ["distributed", "replication", "partitioning"],
        constraints: ["multi-AZ", "leader election", "hot partitions"],
        focusAreas: ["consistent hashing", "quorum", "compaction"],
    },
    {
        id: "seed-payment",
        title: "Payment Orchestrator",
        prompt: "Design a payment orchestration service that routes transactions across multiple PSPs.",
        difficulty: "hard",
        topics: ["payments", "idempotency", "ledger"],
        constraints: ["PCI considerations", "retries", "reconciliation"],
        focusAreas: ["idempotency keys", "saga/outbox", "ledger design"],
    },
    {
        id: "seed-cdn",
        title: "Image CDN",
        prompt: "Design an image upload and transformation CDN for a social app.",
        difficulty: "medium",
        topics: ["cdn", "images", "caching"],
        constraints: ["on-the-fly transforms", "global latency", "cost control"],
        focusAreas: ["origin shield", "cache keys", "processing queue"],
    },
    {
        id: "seed-calendar",
        title: "Shared Calendar",
        prompt: "Design a shared calendar / scheduling system with invites, reminders, and conflict detection.",
        difficulty: "medium",
        topics: ["scheduling", "notifications", "consistency"],
        constraints: ["recurring events", "timezones", "reminders"],
        focusAreas: ["event model", "conflict checks", "notification fanout"],
    },
    {
        id: "seed-auth",
        title: "Auth / SSO Gateway",
        prompt: "Design an authentication and SSO gateway supporting OAuth, MFA, and session revocation.",
        difficulty: "medium",
        topics: ["security", "sessions", "oauth"],
        constraints: ["MFA", "global logout", "third-party IdPs"],
        focusAreas: ["token design", "revocation", "rate limiting"],
    },
];

export function shufflePickQuestions(
    pool: SystemDesignQuestion[],
    count: number,
    difficulty?: SystemDesignDifficulty
): SystemDesignQuestion[] {
    const filtered = difficulty ? pool.filter((q) => q.difficulty === difficulty) : [...pool];
    const source = filtered.length > 0 ? filtered : [...pool];
    const shuffled = [...source];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}

export function normalizeGeneratedQuestions(raw: unknown, fallbackCount: number): SystemDesignQuestion[] {
    const arr = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object" && Array.isArray((raw as { questions?: unknown }).questions)
          ? (raw as { questions: unknown[] }).questions
          : [];

    const out: SystemDesignQuestion[] = [];
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== "object") continue;
        const q = item as Record<string, unknown>;
        const prompt = String(q.prompt || q.question || q.title || "").trim();
        if (!prompt) continue;
        const difficultyRaw = String(q.difficulty || "medium").toLowerCase();
        const difficulty: SystemDesignDifficulty =
            difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium";
        out.push({
            id: String(q.id || `online-${Date.now()}-${i}`),
            title: String(q.title || prompt.slice(0, 48)),
            prompt,
            difficulty,
            topics: Array.isArray(q.topics) ? q.topics.map(String) : [],
            constraints: Array.isArray(q.constraints) ? q.constraints.map(String) : [],
            focusAreas: Array.isArray(q.focusAreas)
                ? q.focusAreas.map(String)
                : Array.isArray(q.focus_areas)
                  ? (q.focus_areas as unknown[]).map(String)
                  : [],
        });
    }

    if (out.length === 0) {
        return shufflePickQuestions(SYSTEM_DESIGN_SEED_QUESTIONS, fallbackCount);
    }
    return out;
}
