import { describe, expect, it } from "vitest";
import {
    buildSearchQueries,
    extractResumeProfileHeuristic,
    webSearchUrls,
} from "../src/utils/jobSearch";

describe("resume job matching helpers", () => {
    const resume = `
Jane Doe
Senior Frontend Engineer
Skills: React, TypeScript, Next.js, Node.js, Tailwind, GraphQL
Experience building product UIs at scale in Bangalore.
`;

    it("extracts skills and roles from resume text", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const skillSet = profile.skills.map((s) => s.toLowerCase());
        expect(skillSet).toEqual(
            expect.arrayContaining(["react", "typescript", "next.js", "tailwind", "graphql"])
        );
        expect(skillSet.some((s) => s.includes("node"))).toBe(true);
        expect(profile.roles.join(" ").toLowerCase()).toMatch(/frontend|software/);
        expect(profile.seniority).toBe("senior");
    });

    it("builds location-aware search queries", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bangalore");
        expect(queries[0].toLowerCase()).toContain("bangalore");
        expect(queries.length).toBeGreaterThan(0);
    });

    it("returns web search deep links with apply-friendly destinations", () => {
        const profile = extractResumeProfileHeuristic(resume);
        const links = webSearchUrls(profile, "Remote");
        expect(links.some((l) => l.url.includes("google.com"))).toBe(true);
        expect(links.some((l) => l.url.includes("linkedin.com/jobs"))).toBe(true);
    });
});
