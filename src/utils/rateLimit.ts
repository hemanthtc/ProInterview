/**
 * Simple in-memory sliding-window rate limiter for serverless/API routes.
 * Resets on cold start — still blocks burst abuse within a warm instance.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
    key: string,
    { limit = 10, windowMs = 15 * 60 * 1000 }: { limit?: number; windowMs?: number } = {}
): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
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

/** Test helper */
export function clearRateLimits() {
    buckets.clear();
}
