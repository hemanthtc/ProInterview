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

    it("rejects expired tokens", () => {
        const payload = {
            identifier: "user@example.com",
            role: "user" as const,
            isOrganization: false,
        };
        // Construct token expired 1 hour ago
        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
        const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() - 3600000 })).toString("base64url");
        const crypto = require("crypto");
        const sig = crypto.createHmac("sha256", process.env.JWT_SECRET!).update(`${header}.${data}`).digest("base64url");
        const expiredToken = `${header}.${data}.${sig}`;

        expect(verifyToken(expiredToken)).toBeNull();
    });
});

describe("storage session auto-logout sync", () => {
    it("auto-logs out when userSessionExpiresAt is in the past", async () => {
        const mockStorage: Record<string, string> = {};
        const { vi } = await import("vitest");
        vi.stubGlobal("window", {
            dispatchEvent: vi.fn(),
            CustomEvent: class {},
        });
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, val: string) => {
                mockStorage[key] = val;
            },
            removeItem: (key: string) => {
                delete mockStorage[key];
            },
            get length() {
                return Object.keys(mockStorage).length;
            },
            key: (i: number) => Object.keys(mockStorage)[i] || null,
        });

        const { getStorageItem, setStorageItem } = await import("../src/utils/storage");
        setStorageItem("userLoggedIn", "true");
        expect(getStorageItem("userLoggedIn")).toBe("true");

        // Simulate session expiry (set to 1 second in the past)
        const past = String(Date.now() - 1000);
        mockStorage["userSessionExpiresAt"] = past;

        // Verify that expired session triggers auto-logout and returns null
        const status = getStorageItem("userLoggedIn");
        expect(status).toBeNull();
        expect(getStorageItem("userSessionExpiresAt")).toBeNull();

        vi.unstubAllGlobals();
    });

    it("verifies getVerifiedSession accepts Authorization Bearer header fallback", async () => {
        const { createToken, getVerifiedSession } = await import("../src/utils/auth");
        process.env.JWT_SECRET = "test-secret-key-with-at-least-32-chars!!";
        const token = createToken({
            identifier: "bearer-user@example.com",
            role: "user",
            isOrganization: false,
        });

        // Mock NextRequest with Authorization header and no cookie
        const fakeReq = {
            headers: new Headers({
                authorization: `Bearer ${token}`,
            }),
            cookies: {
                get: () => undefined,
            },
        } as any;

        const session = await getVerifiedSession(fakeReq);
        expect(session).not.toBeNull();
        expect(session?.identifier).toBe("bearer-user@example.com");
    });
});

