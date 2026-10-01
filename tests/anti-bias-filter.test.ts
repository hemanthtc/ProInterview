import { describe, it, expect } from "vitest";
import {
    detectHardBias,
    stripBiasedLanguage,
    sanitizeJobForBias,
} from "../src/utils/jobSearch";

describe("Anti-Bias Job Filter", () => {
    // ── Hard Reject Tests ──────────────────────────────────────────
    describe("detectHardBias", () => {
        it("rejects 'male only' listings", () => {
            expect(detectHardBias("male only")).not.toBeNull();
            expect(detectHardBias("female only")).not.toBeNull();
        });

        it("rejects 'only male candidates need apply'", () => {
            expect(detectHardBias("Only male candidates need apply")).not.toBeNull();
        });

        it("rejects caste-based discrimination", () => {
            expect(detectHardBias("upper caste preferred")).not.toBeNull();
            expect(detectHardBias("forward caste only")).not.toBeNull();
        });

        it("rejects religion-based discrimination", () => {
            expect(detectHardBias("only hindu candidates")).not.toBeNull();
            expect(detectHardBias("only muslim applicants")).not.toBeNull();
        });

        it("rejects 'must be unmarried'", () => {
            expect(detectHardBias("must be unmarried")).not.toBeNull();
            expect(detectHardBias("only unmarried candidates")).not.toBeNull();
        });

        it("rejects ethnic exclusion", () => {
            expect(detectHardBias("no foreigners")).not.toBeNull();
        });

        it("allows clean job descriptions", () => {
            expect(detectHardBias("Looking for a skilled software engineer with 3 years experience")).toBeNull();
            expect(detectHardBias("Required: B.Tech in Computer Science, proficiency in React and Node.js")).toBeNull();
        });

        it("allows null/empty input", () => {
            expect(detectHardBias("")).toBeNull();
            expect(detectHardBias(null as any)).toBeNull();
        });
    });

    // ── Soft Strip Tests ──────────────────────────────────────────
    describe("stripBiasedLanguage", () => {
        it("strips gender preference language", () => {
            const input = "Male candidates preferred. Must have 3 years experience.";
            const result = stripBiasedLanguage(input);
            expect(result).not.toContain("Male candidates preferred");
            expect(result).toContain("Must have 3 years experience");
        });

        it("strips 'preferably female'", () => {
            const input = "Preferably female. Strong communication skills required.";
            const result = stripBiasedLanguage(input);
            expect(result).not.toContain("Preferably female");
            expect(result).toContain("Strong communication skills required");
        });

        it("strips age restriction language", () => {
            const input = "Age limit: 22-28 years only. B.Tech required.";
            const result = stripBiasedLanguage(input);
            expect(result).not.toContain("22-28");
            expect(result).toContain("B.Tech required");
        });

        it("strips 'below 30 years preferred'", () => {
            const result = stripBiasedLanguage("below 30 years preferred");
            expect(result).not.toContain("below 30 years");
        });

        it("strips marital status requirements", () => {
            const result = stripBiasedLanguage("Unmarried candidates preferred. Good at Excel.");
            expect(result).not.toContain("Unmarried candidates preferred");
            expect(result).toContain("Good at Excel");
        });

        it("strips physical appearance bias", () => {
            const result = stripBiasedLanguage("Good looking required. Knowledge of SAP.");
            expect(result).not.toContain("Good looking required");
            expect(result).toContain("Knowledge of SAP");
        });

        it("strips college tier bias", () => {
            const result = stripBiasedLanguage("Only from IIT colleges. Strong coding skills needed.");
            expect(result).not.toContain("Only from IIT colleges");
            expect(result).toContain("Strong coding skills needed");
        });

        it("strips 'tier-1 colleges preferred'", () => {
            const result = stripBiasedLanguage("Tier-1 colleges preferred. React experience mandatory.");
            expect(result).not.toContain("Tier-1 colleges preferred");
            expect(result).toContain("React experience mandatory");
        });

        it("strips disability discrimination", () => {
            const result = stripBiasedLanguage("Handicapped persons need not apply. Full-time role.");
            expect(result).not.toContain("Handicapped persons need not apply");
            expect(result).toContain("Full-time role");
        });

        it("preserves clean descriptions completely", () => {
            const clean = "Looking for a B.Tech CS graduate with experience in Python, Django, and PostgreSQL. 2-5 years preferred.";
            expect(stripBiasedLanguage(clean)).toBe(clean);
        });

        it("handles empty/null input", () => {
            expect(stripBiasedLanguage("")).toBe("");
            expect(stripBiasedLanguage(null as any)).toBeNull();
        });
    });

    // ── Full Sanitization Tests ──────────────────────────────────────
    describe("sanitizeJobForBias", () => {
        it("returns null for hard-reject jobs", () => {
            const job = {
                role: "Accountant",
                description: "Only male candidates need apply. B.Com required.",
                fullDescription: "We need a male accountant for our finance team.",
            };
            expect(sanitizeJobForBias(job)).toBeNull();
        });

        it("strips soft bias and returns cleaned job", () => {
            const job = {
                role: "Software Engineer",
                description: "Male candidates preferred. 3+ years React experience.",
                fullDescription: "Age limit: 22-28 years. IIT colleges preferred. Strong coding required.",
            };
            const result = sanitizeJobForBias(job);
            expect(result).not.toBeNull();
            expect(result!.description).not.toContain("Male candidates preferred");
            expect(result!.fullDescription).not.toContain("Age limit");
            expect(result!.fullDescription).not.toContain("IIT colleges preferred");
            expect(result!.fullDescription).toContain("Strong coding required");
        });

        it("passes clean jobs through unchanged", () => {
            const job = {
                role: "Data Analyst",
                description: "Analyze business data using Python and SQL.",
                fullDescription: "Required: B.Sc in Statistics or equivalent. 2 years experience.",
            };
            const result = sanitizeJobForBias(job);
            expect(result).not.toBeNull();
            expect(result!.description).toBe(job.description);
            expect(result!.fullDescription).toBe(job.fullDescription);
        });

        it("handles jobs with only role bias (e.g., 'female only' in role)", () => {
            const job = {
                role: "Female Only - Receptionist",
                description: "Front desk management",
                fullDescription: "",
            };
            // "female only" triggers hard reject
            expect(sanitizeJobForBias(job)).toBeNull();
        });
    });
});
