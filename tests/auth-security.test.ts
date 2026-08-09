import { describe, it, expect, beforeEach } from "vitest";
import { generateOtp, hashOtp, verifyOtp, otpExpiry, OTP_TTL_MS } from "../src/utils/otp";
import { clearRateLimits, rateLimit } from "../src/utils/rateLimit";
import { computeFinalInterviewScore, clampScore } from "../src/utils/scoring";
import { createToken, verifyToken } from "../src/utils/auth";

describe("otp utils", () => {
    it("generates a 6-digit OTP", () => {
        for (let i = 0; i < 20; i++) {
            const otp = generateOtp();
            expect(otp).toMatch(/^\d{6}$/);
            expect(Number(otp)).toBeGreaterThanOrEqual(100000);
            expect(Number(otp)).toBeLessThanOrEqual(999999);
        }
    });

    it("hashes OTP and verifies the correct code", async () => {
        const otp = "482913";
        const hashed = await hashOtp(otp);
        expect(hashed).not.toBe(otp);
        expect(hashed.startsWith("$2")).toBe(true);
        expect(await verifyOtp(otp, hashed)).toBe(true);
        expect(await verifyOtp("000000", hashed)).toBe(false);
    });

    it("still accepts legacy plaintext OTPs", async () => {
        expect(await verifyOtp("123456", "123456")).toBe(true);
        expect(await verifyOtp("123456", "654321")).toBe(false);
    });

    it("creates a future otp expiry", () => {
        const exp = otpExpiry(OTP_TTL_MS);
        expect(exp.getTime()).toBeGreaterThan(Date.now());
    });
});

describe("rateLimit", () => {
    beforeEach(() => clearRateLimits());

    it("allows requests under the limit and blocks after", () => {
        const key = "test-user";
        for (let i = 0; i < 3; i++) {
            expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
        }
        const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 });
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSec).toBeGreaterThan(0);
    });
});

describe("scoring", () => {
    it("blends portfolio 35% and interview 65%", () => {
        expect(computeFinalInterviewScore(100, 0)).toBe(35);
        expect(computeFinalInterviewScore(0, 100)).toBe(65);
        expect(computeFinalInterviewScore(80, 90)).toBe(87);
    });

    it("clamps out-of-range scores", () => {
        expect(clampScore(-10)).toBe(0);
        expect(clampScore(150)).toBe(100);
        expect(clampScore(NaN)).toBe(0);
    });
});

describe("auth JWT", () => {
    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret-key-with-at-least-32-chars!!";
    });

    it("creates and verifies a session token", () => {
        const token = createToken({
            identifier: "user@example.com",
            role: "user",
            isOrganization: false,
        });
        const payload = verifyToken(token);
        expect(payload).toEqual({
            identifier: "user@example.com",
            role: "user",
            isOrganization: false,
        });
    });

    it("rejects tampered tokens", () => {
        const token = createToken({
            identifier: "user@example.com",
            role: "user",
            isOrganization: false,
        });
        const bad = token.slice(0, -4) + "xxxx";
        expect(verifyToken(bad)).toBeNull();
    });
});
