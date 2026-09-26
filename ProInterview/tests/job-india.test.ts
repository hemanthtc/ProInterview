import { describe, it, expect } from "vitest";
import {
    buildSearchQueries,
    extractResumeProfileHeuristic,
    INDIA_FALLBACK_JOBS,
} from "../src/utils/jobSearch";

describe("INDIA_FALLBACK_JOBS", () => {
    it("is a non-empty curated list of India-based openings", () => {
        expect(INDIA_FALLBACK_JOBS.length).toBeGreaterThanOrEqual(5);
    });

    it("every entry is tagged as a ProInterview curated (India) source with a real apply link", () => {
        for (const job of INDIA_FALLBACK_JOBS) {
            expect(job.source).toMatch(/india/i);
            expect(job.applyUrl).toMatch(/^https?:\/\//);
            expect(job.id).toMatch(/^job_in_/);
        }
    });

    it("covers major Indian tech hubs (Bangalore/Hyderabad) plus at least one remote-in-India role", () => {
        const locations = INDIA_FALLBACK_JOBS.map((j) => j.location.toLowerCase());
        expect(locations.some((l) => l.includes("bangalore"))).toBe(true);
        expect(locations.some((l) => l.includes("hyderabad"))).toBe(true);
        expect(INDIA_FALLBACK_JOBS.some((j) => j.remote)).toBe(true);
    });

    it("has unique job ids", () => {
        const ids = INDIA_FALLBACK_JOBS.map((j) => j.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe("search query building for Indian locations", () => {
    const resume = `
Rahul Sharma
Backend Engineer
Skills: Java, Spring, Kafka, AWS, PostgreSQL
Experience building distributed systems.
`;

    it("builds a Bangalore-aware primary query", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bangalore");
        expect(queries.length).toBeGreaterThan(0);
        expect(queries[0].toLowerCase()).toContain("bangalore");
    });

    it("also works with the Bengaluru spelling", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bengaluru");
        expect(queries[0].toLowerCase()).toContain("bengaluru");
    });

    it("builds a Hyderabad-aware query for a different resume profile", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Hyderabad");
        expect(queries.some((q) => q.toLowerCase().includes("hyderabad"))).toBe(true);
    });

    it("de-duplicates and caps queries at 4", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bangalore");
        expect(queries.length).toBeLessThanOrEqual(4);
        expect(new Set(queries.map((q) => q.toLowerCase())).size).toBe(queries.length);
    });
});
