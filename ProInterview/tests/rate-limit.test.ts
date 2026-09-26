import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rateLimit, clearRateLimits, rateLimitWithTier, invalidateTierConfigCache } from "../src/utils/rateLimit";

describe("rateLimit (hardcoded)", () => {
    beforeEach(() => clearRateLimits());

    it("allows requests under the limit", () => {
        const key = "rl-test-under";
        for (let i = 0; i < 5; i++) {
            expect(rateLimit(key, { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
        }
    });

    it("blocks requests that exceed the limit", () => {
        const key = "rl-test-over";
        for (let i = 0; i < 3; i++) {
            rateLimit(key, { limit: 3, windowMs: 60_000 });
        }
        const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 });
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSec).toBeGreaterThan(0);
    });

    it("returns a positive retryAfterSec when blocked", () => {
        const key = "rl-test-retry";
        for (let i = 0; i < 2; i++) {
            rateLimit(key, { limit: 2, windowMs: 60_000 });
        }
        const result = rateLimit(key, { limit: 2, windowMs: 60_000 });
        expect(result.allowed).toBe(false);
        expect(result.retryAfterSec).toBeGreaterThanOrEqual(1);
        expect(result.retryAfterSec).toBeLessThanOrEqual(60);
    });

    it("isolates different keys independently", () => {
        rateLimit("user-a", { limit: 1, windowMs: 60_000 });
        const aBlocked = rateLimit("user-a", { limit: 1, windowMs: 60_000 });
        const bAllowed = rateLimit("user-b", { limit: 1, windowMs: 60_000 });
        expect(aBlocked.allowed).toBe(false);
        expect(bAllowed.allowed).toBe(true);
    });

    it("allows all requests when isEnabled is false", () => {
        const key = "rl-disabled";
        for (let i = 0; i < 100; i++) {
            expect(rateLimit(key, { limit: 1, windowMs: 60_000, isEnabled: false }).allowed).toBe(true);
        }
    });

    it("clearRateLimits resets all state", () => {
        const key = "rl-clear";
        rateLimit(key, { limit: 1, windowMs: 60_000 });
        expect(rateLimit(key, { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
        clearRateLimits();
        expect(rateLimit(key, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
    });
});

describe("rateLimitWithTier (tier-aware)", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        clearRateLimits();
        // Delete MONGODB_URI to force connectDB to fail immediately instead of attempting connection
        delete process.env.MONGODB_URI;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it("falls back to hardcoded free-tier defaults when DB is unavailable", async () => {
        // No MongoDB running in test — loadTierConfigs should catch and use HARDCODED_DEFAULTS
        const result = await rateLimitWithTier("tier-test-free", "free");
        expect(result.allowed).toBe(true);  // first request should always be allowed
        expect(result).toHaveProperty("retryAfterSec");
    });

    it("falls back gracefully for unknown tier", async () => {
        const result = await rateLimitWithTier("tier-test-unknown", "nonexistent_tier");
        expect(result.allowed).toBe(true);  // falls back to free tier defaults
    });
});

describe("invalidateTierConfigCache", () => {
    it("is callable without error", () => {
        expect(() => invalidateTierConfigCache()).not.toThrow();
    });
});
