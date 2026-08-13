/**
 * Simple in-memory sliding-window rate limiter for serverless/API routes.
 * Resets on cold start — still blocks burst abuse within a warm instance.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
    key: string,
    { limit = 10, windowMs = 15 * 60 * 1000, isEnabled = true }: { limit?: number; windowMs?: number; isEnabled?: boolean } = {}
): { allowed: boolean; retryAfterSec: number } {
    if (!isEnabled) {
        return { allowed: true, retryAfterSec: 0 };
    }

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

/** Test helper */
export function clearRateLimits() {
    buckets.clear();
}
