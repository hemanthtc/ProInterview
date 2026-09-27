import { describe, expect, it } from "vitest";
import {
    buildSearchQueries,
    extractEducationInfo,
    extractResumeProfileHeuristic,
    scoreJob,
    INDIA_FALLBACK_JOBS,
    type MatchedJob,
    type ResumeProfile,
} from "../src/utils/jobSearch";

describe("Education-First Resume Analysis and Job Search", () => {
    // -------------------------------------------------------------------------
    // TEST 1 — Computer Science
    // -------------------------------------------------------------------------
    it("Test 1 — Computer Science: B.Tech CSE maps to software/IT domain", () => {
        const resume = `
Alex Kumar
Education: B.Tech in Computer Science and Engineering, 2024
Skills: Java, Python, SQL, Git, Linux
Projects:
• Web Application Platform: Built scalable web services with database backend.
Experience: Software Intern for 6 months.
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.education.normalizedDegree).toMatch(/Computer Science|Technology/i);
        expect(profile.education.normalizedField).toBe("Computer Science");
        expect(profile.primaryDomains).toEqual(
            expect.arrayContaining(["Software", "Computer Science", "IT"])
        );
        expect(profile.roles[0]).toMatch(/Software Engineer|Developer/i);

        const queries = buildSearchQueries(profile, "Bangalore");
        expect(queries[0]).toMatch(/Software|Developer/i);
        expect(queries[0]).toContain("Bangalore");
    });

    // -------------------------------------------------------------------------
    // TEST 2 — Commerce
    // -------------------------------------------------------------------------
    it("Test 2 — Commerce: B.Com maps to accounting/finance jobs, software does NOT dominate", () => {
        const resume = `
Priya Sharma
Education: Bachelor of Commerce (B.Com), 2023
Skills: Accounting, Excel, Tally Prime, GST, TDS, Auditing
Projects:
• Inventory and Accounting Project: Managed ledger reconciliation and tax schedules.
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.education.normalizedDegree).toBe("Bachelor of Commerce");
        expect(profile.primaryDomains).toEqual(
            expect.arrayContaining(["Commerce", "Accounting", "Finance"])
        );
        expect(profile.primaryDomains).not.toContain("Software");

        // Primary roles must be commerce/accounting
        expect(profile.roles[0]).toMatch(/Accountant|Accounts Executive|Finance Executive/i);
        expect(profile.roles.join(" ")).not.toMatch(/^Software Engineer/i);

        // Queries should discover accounting/finance jobs
        const queries = buildSearchQueries(profile, "Bangalore");
        expect(queries[0]).toMatch(/Accountant|Accounts|Finance|Commerce/i);
        expect(queries.join(" ")).not.toMatch(/Software Engineer|Developer Intern/i);

        // Scoring: Accountant job must score significantly higher than Software job
        const accountantJob = {
            id: "job_acc_1",
            company: "Deloitte",
            role: "Accounts Executive",
            location: "Bangalore",
            type: "full-time" as const,
            remote: false,
            tags: ["Accounting", "Excel", "GST", "Tally"],
            description: "Manage accounts, balance sheets, and tax compliance.",
            applyUrl: "https://example.com/apply",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const softwareJob = {
            id: "job_swe_1",
            company: "Google",
            role: "Software Engineer",
            location: "Bangalore",
            type: "full-time" as const,
            remote: false,
            tags: ["Java", "C++", "DSA", "Distributed Systems"],
            description: "Build scalable cloud distributed infrastructure.",
            applyUrl: "https://example.com/apply",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const scoredAcc = scoreJob(accountantJob, profile, "Bangalore");
        const scoredSwe = scoreJob(softwareJob, profile, "Bangalore");

        expect(scoredAcc.matchPercent).toBeGreaterThan(scoredSwe.matchPercent);
        expect(scoredAcc.matchBreakdown?.educationMatchScore).toBeGreaterThanOrEqual(80);
        expect(scoredSwe.matchBreakdown?.educationMatchScore).toBeLessThan(35);
        expect(scoredAcc.matchReasons.some((r) => r.includes("Bachelor of Commerce"))).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 3 — Mechanical Engineering
    // -------------------------------------------------------------------------
    it("Test 3 — Mechanical: Mechanical Engineering maps to mechanical/CAD/manufacturing jobs", () => {
        const resume = `
Rohan Verma
Education: B.E in Mechanical Engineering, 2024
Skills: AutoCAD, CAD, SolidWorks, Manufacturing, Machine Design, Lean Six Sigma
Projects:
• Machine Design Optimization: Designed hydraulic press assembly fixtures using CAD.
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.education.normalizedField).toBe("Mechanical Engineering");
        expect(profile.primaryDomains).toEqual(
            expect.arrayContaining(["Mechanical", "Manufacturing", "CAD"])
        );
        expect(profile.roles[0]).toMatch(/Mechanical Engineer|Design Engineer|CAD Engineer/i);

        const queries = buildSearchQueries(profile, "Pune");
        expect(queries[0]).toMatch(/Mechanical|Design|CAD/i);
        expect(queries[0]).toContain("Pune");
    });

    // -------------------------------------------------------------------------
    // TEST 4 — Civil Engineering
    // -------------------------------------------------------------------------
    it("Test 4 — Civil: Civil Engineering maps to civil/construction/infrastructure jobs", () => {
        const resume = `
Karan Patel
Education: B.Tech in Civil Engineering
Skills: AutoCAD, STAAD, Construction, Surveying, Structural Design, Estimation
Projects:
• Building Design Project: Structural analysis and load calculations for commercial high-rise.
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.education.normalizedField).toBe("Civil Engineering");
        expect(profile.primaryDomains).toEqual(
            expect.arrayContaining(["Civil", "Construction", "Infrastructure"])
        );
        expect(profile.roles[0]).toMatch(/Civil Engineer|Site Engineer|Structural Engineer/i);

        const queries = buildSearchQueries(profile, "Hyderabad");
        expect(queries[0]).toMatch(/Civil|Site|Structural/i);
        expect(queries[0]).toContain("Hyderabad");
    });

    // -------------------------------------------------------------------------
    // TEST 5 — MBA Finance
    // -------------------------------------------------------------------------
    it("Test 5 — MBA Finance: MBA Finance maps to finance/business/analyst jobs", () => {
        const resume = `
Neha Gupta
Education: MBA Finance, 2023
Skills: Financial Analysis, Excel, Power BI, Financial Modeling, Valuation, Budgeting
Projects:
• Financial Forecasting Model: 5-year valuation model for consumer retail sector.
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.education.normalizedDegree).toBe("Master of Business Administration - Finance");
        expect(profile.primaryDomains).toEqual(
            expect.arrayContaining(["Finance", "Financial Analysis"])
        );
        expect(profile.roles[0]).toMatch(/Financial Analyst|Finance/i);

        const queries = buildSearchQueries(profile, "Mumbai");
        expect(queries[0]).toMatch(/Financial Analyst|Finance/i);
    });

    // -------------------------------------------------------------------------
    // TEST 6 — Career Transition (B.Com + Python + SQL + Power BI)
    // -------------------------------------------------------------------------
    it("Test 6 — Career Transition: Commerce remains primary domain while analytics roles appear", () => {
        const resume = `
Deepak Mehta
Education: Bachelor of Commerce (B.Com), 2023
Skills: Python, SQL, Power BI, Excel, Financial Analysis, Accounting
Projects:
• Financial Data Analysis Dashboard: Built Power BI and SQL dashboard to analyze retail cash flow trends.
`;
        const profile = extractResumeProfileHeuristic(resume);

        // Commerce/Finance MUST remain the primary domain
        expect(profile.primaryDomains).toEqual(
            expect.arrayContaining(["Commerce", "Accounting", "Finance"])
        );
        expect(profile.primaryDomains[0]).toMatch(/Commerce|Accounting|Finance/i);

        // Secondary transition domains and roles are recognized
        expect(profile.secondaryDomains).toEqual(
            expect.arrayContaining(["Data Analysis", "Financial Analytics", "Business Analytics"])
        );
        expect(profile.roles.some((r) => /Data Analyst|Financial Data Analyst|Business Analyst/i.test(r))).toBe(true);

        // Does NOT convert candidate into pure software developer
        expect(profile.primaryDomains).not.toContain("Software Engineering");
    });

    // -------------------------------------------------------------------------
    // TEST 7 — Manual Search Query
    // -------------------------------------------------------------------------
    it("Test 7 — Manual Search: User query 'Accountant' guides search and uses candidate background to rank", () => {
        const resume = `
Suresh Nair
Education: B.Com, 2023
Skills: Accounting, Tally, Excel, GST
`;
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bangalore", undefined, "Accountant");

        expect(queries[0]).toBe("Accountant Bangalore");

        const accountantJob = {
            id: "job_bng_acc",
            company: "KPMG",
            role: "Junior Accountant",
            location: "Bangalore",
            type: "full-time" as const,
            remote: false,
            tags: ["Accounting", "Excel", "GST"],
            description: "Opening for accountant in Bangalore branch.",
            applyUrl: "https://example.com/apply",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const scored = scoreJob(accountantJob, profile, "Bangalore", undefined, "Accountant");
        expect(scored.matchPercent).toBeGreaterThanOrEqual(80);
        expect(scored.matchReasons.some((r) => r.includes("Accountant"))).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 8 — No Manual Search (Automatic Discovery)
    // -------------------------------------------------------------------------
    it("Test 8 — No Manual Search: Automatically derives education-based job discovery", () => {
        const resume = `
Suresh Nair
Education: B.Com
Skills: Accounting, Tally, Excel, GST
`;
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bangalore", undefined, "");

        expect(queries.length).toBeGreaterThan(0);
        expect(queries[0]).toMatch(/Accountant|Accounts|Finance|Commerce/i);
        expect(queries[0]).toContain("Bangalore");
        expect(queries[0]).not.toMatch(/Software/i);
    });

    // -------------------------------------------------------------------------
    // TEST 9 — Non-Technical Degree + Technical Project
    // -------------------------------------------------------------------------
    it("Test 9 — Non-Technical Degree + Tech Project: React project does NOT make Software Developer the top career path", () => {
        const resume = `
Ananya Roy
Education: B.Com, 2024
Skills: React, JavaScript, Excel, Accounting, Tally, GST
Projects:
• React Inventory Application: Built an inventory tracking web interface for a retail business.
`;
        const profile = extractResumeProfileHeuristic(resume);

        // Commerce/Accounting remains primary
        expect(profile.primaryDomains[0]).toMatch(/Commerce|Accounting|Finance/i);
        expect(profile.roles[0]).toMatch(/Accountant|Accounts Executive|Finance/i);

        // React is recognized as a skill or secondary domain, but Software Engineer is NOT top role
        expect(profile.roles[0]).not.toBe("Software Engineer");
        expect(profile.roles[0]).not.toBe("Full Stack Developer");
        expect(profile.secondaryDomains).toEqual(
            expect.arrayContaining(["Web & Software Applications"])
        );
    });

    // -------------------------------------------------------------------------
    // ADDITIONAL TESTS: Missing Education, Fallback Scoring, and Query Control
    // -------------------------------------------------------------------------
    it("handles missing education gracefully without fabricating a Software Engineer profile", () => {
        const resume = `
Taylor Morgan
Professional with experience in marketing, digital campaigns, social media, and customer outreach.
Skills: SEO, Content Marketing, Social Media, Google Analytics
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.primaryDomains).toEqual(
            expect.arrayContaining(["Marketing", "Business"])
        );
        expect(profile.primaryDomains).not.toContain("Software");
        expect(profile.roles[0]).toMatch(/Marketing/i);
    });

    it("caps search queries at 4 and prevents large keyword concatenation", () => {
        const resume = `
John Doe
Education: B.Tech CSE
Skills: Java, Python, C++, React, Node, Express, MongoDB, Postgres, Redis, AWS, Docker, Kubernetes, Kafka, Linux, Git
`;
        const profile = extractResumeProfileHeuristic(resume);
        const queries = buildSearchQueries(profile, "Bangalore");

        expect(queries.length).toBeLessThanOrEqual(4);
        for (const q of queries) {
            // Queries should be clean and targeted (not dumping 10+ words)
            expect(q.split(/\s+/).length).toBeLessThanOrEqual(5);
        }
    });

    it("verifies multi-domain coverage in INDIA_FALLBACK_JOBS", () => {
        const roles = INDIA_FALLBACK_JOBS.map((j) => j.role.toLowerCase());
        const tags = INDIA_FALLBACK_JOBS.flatMap((j) => j.tags.map((t) => t.toLowerCase()));

        // Covers commerce, mechanical, civil, and software
        expect(roles.some((r) => r.includes("account") || r.includes("audit") || r.includes("finance"))).toBe(true);
        expect(roles.some((r) => r.includes("mechanical") || r.includes("manufacturing"))).toBe(true);
        expect(roles.some((r) => r.includes("civil") || r.includes("site"))).toBe(true);
        expect(roles.some((r) => r.includes("software") || r.includes("intern"))).toBe(true);

        expect(tags.some((t) => t.includes("gst") || t.includes("accounting"))).toBe(true);
        expect(tags.some((t) => t.includes("autocad"))).toBe(true);
    });
});
