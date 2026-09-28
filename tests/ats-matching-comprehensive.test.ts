import { describe, expect, it } from "vitest";
import {
    extractResumeProfileHeuristic,
    scoreJob,
    deduplicateJobs,
    type MatchedJob,
} from "../src/utils/jobSearch";
import { computeDeterministicAts, validateAiAtsClaims } from "../src/utils/atsEngine";
import { matchesSkillToken } from "../src/utils/tokenMatching";

describe("ATS Matching and Open Jobs Comprehensive Test Suite (16 Core Scenarios)", () => {
    // -------------------------------------------------------------------------
    // TEST 1: B.Com + Accounting + Excel + GST
    // Expected: Accounting/Finance jobs rank highly.
    // -------------------------------------------------------------------------
    it("TEST 1: B.Com + Accounting + Excel + GST ranks Accounting/Finance jobs highly", () => {
        const resume = `
Ramesh Patel
Education: Bachelor of Commerce (B.Com), 2023
Skills: Accounting, Excel, GST, Tally Prime
Experience: Junior Accountant for 1 year.
`;
        const profile = extractResumeProfileHeuristic(resume);

        const accountingJob: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown"> = {
            id: "job_acc_deloitte",
            company: "Deloitte India",
            role: "Accounts Executive",
            location: "Bangalore",
            type: "full-time",
            remote: false,
            tags: ["Accounting", "Excel", "GST"],
            description: "Manage GST filing, bank reconciliation, and general ledger accounts.",
            applyUrl: "https://example.com/deloitte-acc",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const sweJob: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown"> = {
            id: "job_swe_google",
            company: "Google",
            role: "Software Engineer",
            location: "Bangalore",
            type: "full-time",
            remote: false,
            tags: ["Java", "Distributed Systems", "C++"],
            description: "Develop cloud infrastructure services.",
            applyUrl: "https://example.com/google-swe",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const scoredAcc = scoreJob(accountingJob, profile, "Bangalore");
        const scoredSwe = scoreJob(sweJob, profile, "Bangalore");

        expect(scoredAcc.matchPercent).toBeGreaterThanOrEqual(80);
        expect(scoredSwe.matchPercent).toBeLessThan(40);
        expect(scoredAcc.matchPercent).toBeGreaterThan(scoredSwe.matchPercent);
        expect(profile.primaryDomains).toContain("Commerce");
    });

    // -------------------------------------------------------------------------
    // TEST 2: B.Tech CSE + Java + React + SQL
    // Expected: Software/IT jobs rank highly.
    // -------------------------------------------------------------------------
    it("TEST 2: B.Tech CSE + Java + React + SQL ranks Software/IT jobs highly", () => {
        const resume = `
Siddharth Rao
Education: B.Tech in Computer Science and Engineering, 2024
Skills: Java, React, SQL, Spring Boot, Git
Projects:
• E-Commerce Web App: Full stack platform using React and Java backend.
`;
        const profile = extractResumeProfileHeuristic(resume);

        const devJob: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown"> = {
            id: "job_swe_amazon",
            company: "Amazon",
            role: "Software Development Engineer",
            location: "Bangalore",
            type: "full-time",
            remote: false,
            tags: ["Java", "React", "SQL"],
            description: "Build customer-facing web services using Java and React.",
            applyUrl: "https://example.com/amazon-sde",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const scoredDev = scoreJob(devJob, profile, "Bangalore");
        expect(scoredDev.matchPercent).toBeGreaterThanOrEqual(85);
        expect(scoredDev.matchBreakdown?.educationMatchScore).toBeGreaterThanOrEqual(90);
        expect(profile.roles[0]).toMatch(/Software Engineer|Developer/i);
    });

    // -------------------------------------------------------------------------
    // TEST 3: B.E Mechanical + AutoCAD + SolidWorks
    // Expected: Mechanical/CAD jobs rank highly.
    // -------------------------------------------------------------------------
    it("TEST 3: B.E Mechanical + AutoCAD + SolidWorks ranks Mechanical/CAD jobs highly", () => {
        const resume = `
Vikram Kulkarni
Education: B.E in Mechanical Engineering, 2024
Skills: AutoCAD, SolidWorks, Manufacturing, Machine Design
Projects:
• Gearbox Housing Design: Modeled mechanical parts in SolidWorks and analyzed tolerances.
`;
        const profile = extractResumeProfileHeuristic(resume);

        const mechJob: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown"> = {
            id: "job_mech_tata",
            company: "Tata Motors",
            role: "Mechanical Design Engineer",
            location: "Pune",
            type: "full-time",
            remote: false,
            tags: ["AutoCAD", "SolidWorks", "Manufacturing"],
            description: "Responsible for automotive CAD design and component modeling.",
            applyUrl: "https://example.com/tata-mech",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const scoredMech = scoreJob(mechJob, profile, "Pune");
        expect(scoredMech.matchPercent).toBeGreaterThanOrEqual(80);
        expect(profile.primaryDomains).toContain("Mechanical");
        expect(profile.roles[0]).toMatch(/Mechanical Engineer|Design Engineer|CAD Engineer/i);
    });

    // -------------------------------------------------------------------------
    // TEST 4: B.E Civil + AutoCAD + STAAD
    // Expected: Civil/Structural jobs rank highly.
    // -------------------------------------------------------------------------
    it("TEST 4: B.E Civil + AutoCAD + STAAD ranks Civil/Structural jobs highly", () => {
        const resume = `
Anil Deshmukh
Education: B.E in Civil Engineering, 2023
Skills: AutoCAD, STAAD, Structural Analysis, Construction, Surveying
`;
        const profile = extractResumeProfileHeuristic(resume);

        const civilJob: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown"> = {
            id: "job_civil_lt",
            company: "L&T Construction",
            role: "Graduate Civil Engineer / Structural Trainee",
            location: "Hyderabad",
            type: "full-time",
            remote: false,
            tags: ["AutoCAD", "STAAD", "Structural Design", "Construction"],
            description: "Perform structural modeling using STAAD and supervise metro site construction.",
            applyUrl: "https://example.com/lt-civil",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const scoredCivil = scoreJob(civilJob, profile, "Hyderabad");
        expect(scoredCivil.matchPercent).toBeGreaterThanOrEqual(80);
        expect(profile.primaryDomains).toContain("Civil");
        expect(profile.roles[0]).toMatch(/Civil Engineer|Site Engineer|Structural Engineer/i);
    });

    // -------------------------------------------------------------------------
    // TEST 5: B.Com + Python + SQL + Power BI
    // Expected: Finance/Commerce remains primary while Analytics can appear as secondary.
    // -------------------------------------------------------------------------
    it("TEST 5: B.Com + Python + SQL + Power BI keeps Finance primary and Analytics secondary", () => {
        const resume = `
Kavita Iyer
Education: Bachelor of Commerce (B.Com), 2023
Skills: Python, SQL, Power BI, Excel, Financial Analysis, Accounting
Projects:
• Financial KPI Dashboard: Visualized cash flow metrics in Power BI using SQL database.
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.primaryDomains[0]).toMatch(/Commerce|Accounting|Finance/i);
        expect(profile.secondaryDomains).toContain("Data Analysis");
        expect(profile.roles.some((r) => /Data Analyst|Financial Data Analyst|Business Analyst/i.test(r))).toBe(true);
        expect(profile.primaryDomains).not.toContain("Software");
    });

    // -------------------------------------------------------------------------
    // TEST 6: B.Com + React project
    // Expected: React does not automatically make Software Engineer the primary domain.
    // -------------------------------------------------------------------------
    it("TEST 6: B.Com + React project does not override primary education domain", () => {
        const resume = `
Meera Nair
Education: B.Com, 2024
Skills: React, JavaScript, Accounting, Excel, GST, Tally
Projects:
• Web Inventory Tracker: Built a small React frontend application for tracking store stock.
`;
        const profile = extractResumeProfileHeuristic(resume);

        expect(profile.primaryDomains[0]).toMatch(/Commerce|Accounting|Finance/i);
        expect(profile.roles[0]).not.toBe("Software Engineer");
        expect(profile.roles[0]).not.toBe("Full Stack Developer");
        expect(profile.secondaryDomains).toContain("Web & Software Applications");
    });

    // -------------------------------------------------------------------------
    // TEST 7: Manual search: Data Analyst
    // Expected: Data Analyst jobs are discovered, but compatibility remains resume-based (no artificial 98%).
    // -------------------------------------------------------------------------
    it("TEST 7: Manual search discovers role but does NOT inflate candidate qualification score", () => {
        const resume = `
Rajesh Gupta
Education: B.Com, 2024
Skills: Accounting, Excel, GST, Tally
`;
        const profile = extractResumeProfileHeuristic(resume);

        const dataAnalystJob: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown"> = {
            id: "job_da_mckinsey",
            company: "McKinsey",
            role: "Data Analyst",
            location: "Bangalore",
            type: "full-time",
            remote: false,
            tags: ["Python", "SQL", "Tableau", "Machine Learning"],
            description: "Extract insights from massive datasets using Python, SQL, and predictive statistical models.",
            applyUrl: "https://example.com/mckinsey-da",
            postedAt: "2026-08-01",
            source: "Test",
        };

        const scored = scoreJob(dataAnalystJob, profile, "Bangalore", undefined, "Data Analyst");

        // Discovered via manual search, but candidate lacks Python, SQL, Tableau, and Math/CS degree:
        // Education compatibility must NOT be artificially set to 98%!
        expect(scored.matchBreakdown?.educationMatchScore).toBeLessThan(70);
        expect(scored.matchPercent).toBeLessThan(60);
    });

    // -------------------------------------------------------------------------
    // TEST 8: JD: B.Com + Excel + GST; Resume: B.Com + Excel + GST
    // Expected: Strong match (>= 85%).
    // -------------------------------------------------------------------------
    it("TEST 8: Direct requirement match yields strong ATS score", () => {
        const jd = `
Role: Accounts Associate
Requirements:
- Must have Bachelor of Commerce (B.Com) degree.
- Required skills: Excel, GST compliance, Accounting.
`;
        const resume = `
Varun Singh
Education: Bachelor of Commerce (B.Com), 2023
Skills: Accounting, Excel, GST
`;
        const result = computeDeterministicAts(resume, jd, "Test Co", "Accounts Associate");
        expect(result.matchPercent).toBeGreaterThanOrEqual(85);
        expect(result.breakdown.educationMatch).toBeGreaterThanOrEqual(90);
        expect(result.readyForMock).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 9: JD: B.Tech CSE + Java + Spring Boot; Resume: B.Com + Excel
    // Expected: Low match (<= 35%).
    // -------------------------------------------------------------------------
    it("TEST 9: Divergent qualification yields low ATS score", () => {
        const jd = `
Role: Backend Software Engineer
Requirements:
- Must have B.Tech in Computer Science and Engineering.
- Required skills: Java, Spring Boot, Microservices, MySQL.
- 3+ years experience required.
`;
        const resume = `
Amit Roy
Education: Bachelor of Commerce (B.Com), 2024
Skills: Excel, Accounting
`;
        const result = computeDeterministicAts(resume, jd, "Tech Corp", "Backend Software Engineer");
        expect(result.matchPercent).toBeLessThanOrEqual(35);
        expect(result.breakdown.educationMatch).toBeLessThanOrEqual(25);
        expect(result.readyForMock).toBe(false);
    });

    // -------------------------------------------------------------------------
    // TEST 10: JD: JavaScript; Resume: Java
    // Expected: JavaScript is NOT treated as an exact match for Java.
    // -------------------------------------------------------------------------
    it("TEST 10: Token-aware matching prevents Java from matching JavaScript", () => {
        const javaResume = "Skills: Java, Spring, Hibernate, SQL";
        const hasJs = matchesSkillToken(javaResume, "javascript");
        const hasJava = matchesSkillToken(javaResume, "java");

        expect(hasJs).toBe(false);
        expect(hasJava).toBe(true);

        const jsResume = "Skills: JavaScript, Node.js, React";
        const hasJavaInJs = matchesSkillToken(jsResume, "java");
        expect(hasJavaInJs).toBe(false);
    });

    // -------------------------------------------------------------------------
    // TEST 11: Two jobs with same title but different requirements
    // Expected: Different ATS scores.
    // -------------------------------------------------------------------------
    it("TEST 11: Different job descriptions for the same title produce distinct ATS scores", () => {
        const resume = `
Pooja Hegde
Education: B.Com
Skills: Accounting, Excel, GST, Tally Prime
`;
        const jd1 = `
Role: Financial Analyst
Requirements:
- Required: B.Com, Excel, GST, Accounting, Tally.
`;
        const jd2 = `
Role: Financial Analyst
Requirements:
- Required: MBA Finance or B.Tech, Python, R, Machine Learning, Power BI, Bloomberg Terminal.
`;
        const score1 = computeDeterministicAts(resume, jd1, "Company A", "Financial Analyst");
        const score2 = computeDeterministicAts(resume, jd2, "Company B", "Financial Analyst");

        expect(score1.matchPercent).toBeGreaterThan(score2.matchPercent);
        expect(score1.matchPercent - score2.matchPercent).toBeGreaterThanOrEqual(30);
    });

    // -------------------------------------------------------------------------
    // TEST 12: Same job + changed resume
    // Expected: ATS result recalculates dynamically.
    // -------------------------------------------------------------------------
    it("TEST 12: Changing resume recalculates ATS score", () => {
        const jd = `
Role: CAD Design Engineer
Requirements:
- Must have B.E in Mechanical Engineering.
- Required skills: AutoCAD, SolidWorks, GD&T.
`;
        const basicResume = `
Naveen Kumar
Education: B.Com
Skills: Excel
`;
        const matchedResume = `
Naveen Kumar
Education: B.E in Mechanical Engineering
Skills: AutoCAD, SolidWorks, GD&T, Machine Design
`;
        const res1 = computeDeterministicAts(basicResume, jd, "Engineering Co", "CAD Design Engineer");
        const res2 = computeDeterministicAts(matchedResume, jd, "Engineering Co", "CAD Design Engineer");

        expect(res2.matchPercent).toBeGreaterThan(res1.matchPercent);
        expect(res2.matchPercent - res1.matchPercent).toBeGreaterThanOrEqual(40);
    });

    // -------------------------------------------------------------------------
    // TEST 13: Long job description
    // Expected: Complete available JD is analyzed.
    // -------------------------------------------------------------------------
    it("TEST 13: Long job description requirements at the bottom are analyzed", () => {
        let longJd = "Role: Operations Manager at Global Logistics Inc.\n";
        for (let i = 0; i < 60; i++) {
            longJd += `Day to day operational duties and cross-functional team milestone ${i} tracking.\n`;
        }
        longJd += `
Required Qualifications:
- Education: Bachelor's degree required.
- Mandatory Skill: Supply Chain Management, Procurement, Inventory Optimization, Advanced Excel.
`;
        const resume = `
Kishore Roy
Education: Bachelor of Business Administration
Skills: Supply Chain Management, Procurement, Advanced Excel, Operations
`;
        const res = computeDeterministicAts(resume, longJd, "Global Logistics", "Operations Manager");
        expect(res.keywordHits.some((h) => /supply chain|procurement|excel/i.test(h))).toBe(true);
        expect(res.matchPercent).toBeGreaterThanOrEqual(70);
    });

    // -------------------------------------------------------------------------
    // TEST 14: Long resume
    // Expected: Important resume information is not ignored.
    // -------------------------------------------------------------------------
    it("TEST 14: Long resume with deep experience and skills is parsed accurately", () => {
        let longResume = `
Dr. Sunita Sharma
Senior Pharmacist & Clinical Specialist
Summary: 10 years of healthcare experience.
`;
        for (let i = 0; i < 40; i++) {
            longResume += `Managed medical records and dosage protocol ${i} in clinical department.\n`;
        }
        longResume += `
Education: Bachelor of Pharmacy (B.Pharm), 2014
Skills: Pharmacology, Drug Formulation, GMP, Clinical Research, HPLC
`;
        const jd = `
Role: Quality Control Pharmacist
Requirements:
- Education: B.Pharm required.
- Required Skills: Pharmacology, GMP, HPLC, Drug Formulation.
`;
        const res = computeDeterministicAts(longResume, jd, "Pharma Lab", "Quality Control Pharmacist");
        expect(res.breakdown.educationMatch).toBeGreaterThanOrEqual(90);
        expect(res.matchPercent).toBeGreaterThanOrEqual(80);
    });

    // -------------------------------------------------------------------------
    // TEST 15: Multiple job providers return same job
    // Expected: Duplicate removed.
    // -------------------------------------------------------------------------
    it("TEST 15: Deduplicates jobs returned by multiple providers", () => {
        const rawJobs = [
            {
                id: "remotive_101",
                company: "Google India Pvt Ltd",
                role: "Software Engineer",
                location: "Bangalore",
                applyUrl: "https://careers.google.com/jobs/101?source=remotive",
                description: "Short snippet",
                fullDescription: "Full description from Remotive",
            },
            {
                id: "adzuna_202",
                company: "Google",
                role: "Software Engineer",
                location: "Bangalore, India",
                applyUrl: "https://careers.google.com/jobs/101?source=adzuna",
                description: "Short snippet from Adzuna",
                fullDescription: "Comprehensive full description with requirements from Adzuna",
            },
            {
                id: "arbeitnow_303",
                company: "Deloitte",
                role: "Tax Analyst",
                location: "Hyderabad",
                applyUrl: "https://deloitte.com/tax-analyst",
                description: "Deloitte tax role",
            },
        ];

        const deduped = deduplicateJobs(rawJobs);
        expect(deduped.length).toBe(2);
        // Preserves whichever had the richer description
        const googleJob = deduped.find((j) => j.company.toLowerCase().includes("google"));
        expect(googleJob?.fullDescription).toContain("Comprehensive full description");
    });

    // -------------------------------------------------------------------------
    // TEST 16: AI returns unsupported skill match
    // Expected: Validation rejects unsupported claim.
    // -------------------------------------------------------------------------
    it("TEST 16: Validation rejects unsupported AI claims", () => {
        const resume = `
John Smith
Education: B.Com
Skills: Accounting, Excel
`;
        const jd = `
Role: Software Developer
Requirements: Python, C++, Docker, Kubernetes
`;
        const deterministic = computeDeterministicAts(resume, jd, "Tech Co", "Software Developer");

        // Simulated hallucinating AI output claiming candidate matched Python and Docker
        const hallucinatedAiOutput = {
            matchPercent: 90,
            summaryVerdict: "Candidate is a perfect fit with strong Python experience!",
            breakdown: {
                skillsMatch: 95,
                experienceMatch: 90,
                toolsMatch: 90,
                educationMatch: 85,
            },
            keywordHits: ["Python", "Docker", "Excel"],
            keywordGaps: ["Kubernetes"],
            sectionAdvice: ["Keep up the great work."],
            rewrittenBullets: ["Built microservices in Docker."],
        };

        const validated = validateAiAtsClaims(hallucinatedAiOutput, deterministic, resume, jd);

        // Validation MUST reject Python and Docker because they do not exist in the candidate's resume!
        expect(validated.keywordHits).not.toContain("Python");
        expect(validated.keywordHits).not.toContain("Docker");
        // And matchPercent must NOT remain at hallucinated 90%
        expect(validated.matchPercent).toBeLessThan(45);
        expect(validated.readyForMock).toBe(false);
    });
});
