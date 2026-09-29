import { describe, expect, it } from "vitest";
import {
    buildSearchQueries,
    extractResumeProfileHeuristic,
    scoreJob,
    fetchAdzunaIndia,
} from "../src/utils/jobSearch";

describe("Adzuna Job Search and Preferences Logic", () => {
    const resume = `
Arjun Verma
Education: B.Tech in Computer Science and Engineering
Skills: React, TypeScript, Node.js, Next.js, PostgreSQL, Tailwind CSS
Projects:
• SaaS Dashboard: Full stack dashboard built with React and Node.js.
`;

    it("prioritizes user specific job query in buildSearchQueries", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bangalore", undefined, "React Developer");
        expect(queries[0].toLowerCase()).toContain("react developer");
    });

    it("gives a relevance score bonus to jobs matching the specific searched role", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const matchedJob = {
            id: "adzuna_test_1",
            company: "Tech Corp",
            role: "React Developer",
            location: "Bangalore",
            type: "full-time" as const,
            remote: false,
            tags: ["React", "TypeScript"],
            description: "Looking for an experienced React Developer to build UI applications.",
            applyUrl: "https://example.com/apply",
            postedAt: "2026-08-01",
            source: "Adzuna India",
        };

        const genericJob = {
            id: "adzuna_test_2",
            company: "Tech Corp",
            role: "DevOps Engineer",
            location: "Bangalore",
            type: "full-time" as const,
            remote: false,
            tags: ["Docker", "Kubernetes"],
            description: "Looking for a DevOps engineer for AWS infrastructure.",
            applyUrl: "https://example.com/apply",
            postedAt: "2026-08-01",
            source: "Adzuna India",
        };

        const scoreWithSearch = scoreJob(matchedJob, profile, "Bangalore", undefined, "React Developer");
        const scoreWithoutSearch = scoreJob(genericJob, profile, "Bangalore", undefined, "React Developer");

        expect(scoreWithSearch.matchPercent).toBeGreaterThan(scoreWithoutSearch.matchPercent);
        expect(scoreWithSearch.matchReasons.some((r) => r.includes("React Developer"))).toBe(true);
    });

    it("gracefully returns empty array when Adzuna keys are placeholder dummy values", async () => {
        process.env.ADZUNA_APP_ID = "your_adzuna_app_id_here";
        process.env.ADZUNA_APP_KEY = "your_adzuna_app_key_here";
        const results = await fetchAdzunaIndia("Frontend Developer", "Bangalore");
        expect(results).toEqual([]);
    });
});
