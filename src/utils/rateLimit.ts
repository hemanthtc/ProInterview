/**
 * Sliding-window rate limiter with admin-configurable tier limits.
 *
 * Two usage patterns:
 *   1) rateLimit(key, { limit, windowMs })          — hardcoded limits (backward compat)
 *   2) rateLimitWithTier(key, userTier)              — reads limits from admin MongoDB config
 *
 * When admin config is used, results are cached in-memory for 60 s to avoid
 * a DB round-trip on every request. If MongoDB is unreachable the limiter
 * falls back to conservative hardcoded defaults (fail-closed).
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/* ---------- cached admin tier configs ---------- */

interface TierConfig {
    limit: number;
    windowMs: number;
    isEnabled: boolean;
    mode: "unlimited" | "customized";
}

// Default (conservative) limits per tier — used when admin config is unavailable
const HARDCODED_DEFAULTS: Record<string, TierConfig> = {
    free:         { limit: 15,  windowMs: 15 * 60 * 1000, isEnabled: true,  mode: "customized" },
    pro_monthly:  { limit: 50,  windowMs: 15 * 60 * 1000, isEnabled: true,  mode: "customized" },
    pro_yearly:   { limit: 100, windowMs: 15 * 60 * 1000, isEnabled: true,  mode: "customized" },
    elite:        { limit: 250, windowMs: 15 * 60 * 1000, isEnabled: true,  mode: "customized" },
    enterprise:   { limit: 1000, windowMs: 15 * 60 * 1000, isEnabled: false, mode: "unlimited"  },
};

let cachedTierConfigs: Record<string, TierConfig> = {};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // refresh every 60 seconds

async function loadTierConfigs(): Promise<Record<string, TierConfig>> {
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_TTL_MS && Object.keys(cachedTierConfigs).length > 0) {
        return cachedTierConfigs;
    }

    try {
        // Dynamic import to avoid circular dependency and allow usage in non-DB contexts
        const { default: connectDB } = await import("@/utils/db");
        const { default: RateLimitConfig } = await import("@/models/RateLimitConfig");

        await connectDB();
        const docs = await RateLimitConfig.find({}).lean();

        if (docs && docs.length > 0) {
            const configs: Record<string, TierConfig> = {};
            for (const doc of docs as any[]) {
                configs[doc.tier] = {
                    limit: doc.maxRequests ?? 15,
                    windowMs: (doc.windowMinutes ?? 15) * 60 * 1000,
                    isEnabled: doc.isEnabled ?? true,
                    mode: doc.mode ?? "customized",
                };
            }
            cachedTierConfigs = configs;
            cacheTimestamp = now;
            return configs;
        }
    } catch {
        // MongoDB unavailable — fall through to hardcoded defaults (fail-closed)
    }

    return HARDCODED_DEFAULTS;
}

/* ---------- core sliding-window logic ---------- */

function applySlidingWindow(
    key: string,
    limit: number,
    windowMs: number
): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();

    // Periodic garbage collection to prevent memory leak
    if (buckets.size > 1000) {
        for (const [k, b] of buckets.entries()) {
            b.timestamps = b.timestamps.filter((t) => now - t < windowMs);
            if (b.timestamps.length === 0) {
                buckets.delete(k);
            }
        }
    }

    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= limit) {
        const oldest = bucket.timestamps[0] ?? now;
        const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
        buckets.set(key, bucket);
        return { allowed: false, retryAfterSec };
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    return { allowed: true, retryAfterSec: 0 };
}

/* ---------- public API ---------- */

/**
 * Original rate limiter with hardcoded limits (backward compatible).
 * Use this for auth routes and other non-tier-specific endpoints.
 */
export function rateLimit(
    key: string,
    { limit = 10, windowMs = 15 * 60 * 1000, isEnabled = true }: { limit?: number; windowMs?: number; isEnabled?: boolean } = {}
): { allowed: boolean; retryAfterSec: number } {
    if (!isEnabled) {
        return { allowed: true, retryAfterSec: 0 };
    }
    return applySlidingWindow(key, limit, windowMs);
}

/**
 * Tier-aware rate limiter that reads admin-configured limits from MongoDB.
 * Falls back to conservative defaults if DB is unavailable (fail-closed).
 *
 * @param key      - Unique identifier (e.g. "interviewer:user@email.com")
 * @param userTier - The user's subscription tier (e.g. "free", "pro_monthly", "elite")
 */
export async function rateLimitWithTier(
    key: string,
    userTier: string
): Promise<{ allowed: boolean; retryAfterSec: number }> {
    const configs = await loadTierConfigs();
    const tierConfig = configs[userTier] || configs["free"] || HARDCODED_DEFAULTS["free"];

    // If admin set this tier to "unlimited" or disabled rate limiting
    if (tierConfig.mode === "unlimited" || !tierConfig.isEnabled) {
        return { allowed: true, retryAfterSec: 0 };
    }

    return applySlidingWindow(key, tierConfig.limit, tierConfig.windowMs);
}

/** Invalidate the cached tier configs (e.g. after admin update). */
export function invalidateTierConfigCache(): void {
    cacheTimestamp = 0;
    cachedTierConfigs = {};
}

/** Test helper */
export function clearRateLimits() {
    buckets.clear();
    cacheTimestamp = 0;
    cachedTierConfigs = {};
}
