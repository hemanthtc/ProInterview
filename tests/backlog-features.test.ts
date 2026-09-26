import { describe, it, expect, beforeEach } from "vitest";
import { extractMeetingUrl, buildPrepPackFromEmail } from "../src/utils/prepPack";
import { progressivePath, getProblemPublic, CODING_PROBLEMS } from "../src/data/codingProblems";
import { resolveDomainPack, DOMAIN_PACKS } from "../src/data/domainPacks";
import { clearRateLimits, rateLimit } from "../src/utils/rateLimit";

describe("prep pack meeting links", () => {
    it("extracts Google Meet URLs", () => {
        expect(extractMeetingUrl("Join https://meet.google.com/abc-defg-hij tomorrow")).toContain("meet.google.com");
    });

    it("stores meetingUrl on packs", () => {
        const pack = buildPrepPackFromEmail({
            company: "Acme",
            role: "SWE",
            meetingUrl: "https://meet.google.com/abc-defg-hij",
        });
        expect(pack.meetingUrl).toContain("meet.google.com");
        expect(pack.checklist.length).toBeGreaterThan(3);
    });
});

describe("coding progression", () => {
    it("builds a progressive path", () => {
        const path = progressivePath();
        expect(path[0]).toBe("two-sum");
        expect(path.length).toBeGreaterThan(2);
    });

    it("hides hidden tests in public payload", () => {
        const pub = getProblemPublic("two-sum");
        expect(pub && "hiddenTests" in pub).toBe(false);
        expect(pub?.hiddenTestCount).toBe(CODING_PROBLEMS[0].hiddenTests.length);
    });
});

describe("domain packs", () => {
    it("resolves known domains", () => {
        expect(resolveDomainPack("ml")?.name).toMatch(/ML/i);
        expect(DOMAIN_PACKS.length).toBeGreaterThanOrEqual(6);
    });
});

describe("rate limit", () => {
    beforeEach(() => clearRateLimits());
    it("blocks after limit", () => {
        expect(rateLimit("x", { limit: 2 }).allowed).toBe(true);
        expect(rateLimit("x", { limit: 2 }).allowed).toBe(true);
        expect(rateLimit("x", { limit: 2 }).allowed).toBe(false);
    });
});
