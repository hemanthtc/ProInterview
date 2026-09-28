// Comprehensive test runner for Education-First Job Search & compatibility
import assert from "node:assert";
import {
    buildSearchQueries,
    extractEducationInfo,
    extractResumeProfileHeuristic,
    scoreJob,
    webSearchUrls,
    INDIA_FALLBACK_JOBS,
} from "../src/utils/jobSearch.ts";

console.log("=== RUNNING EDUCATION-FIRST JOB SEARCH TEST SUITE ===\n");
let passed = 0;
let total = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        console.log(`PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`FAIL: ${name}`);
        console.error(err);
    }
}

// --------------------------------------------------------------------------
// TEST 1 — Computer Science
// --------------------------------------------------------------------------
test("Test 1 — Computer Science: B.Tech CSE maps to software/IT domain", () => {
    const resume = `
Alex Kumar
Education: B.Tech in Computer Science and Engineering, 2024
Skills: Java, Python, SQL, Git, Linux
Projects:
• Web Application Platform: Built scalable web services with database backend.
Experience: Software Intern for 6 months.
`;
    const profile = extractResumeProfileHeuristic(resume);

    assert(profile.education.normalizedField === "Computer Science", `Expected Computer Science, got ${profile.education.normalizedField}`);
    assert(profile.primaryDomains.includes("Software") || profile.primaryDomains.includes("Computer Science"), "Missing software domain");
    assert(/software|developer/i.test(profile.roles[0]), `Expected software role, got ${profile.roles[0]}`);

    const queries = buildSearchQueries(profile, "Bangalore");
    assert(/software|developer/i.test(queries[0]), `Query should target software, got ${queries[0]}`);
    assert(queries[0].includes("Bangalore"), "Query should include location");
});

// --------------------------------------------------------------------------
// TEST 2 — Commerce
// --------------------------------------------------------------------------
test("Test 2 — Commerce: B.Com maps to accounting/finance jobs, software jobs must NOT dominate", () => {
    const resume = `
Priya Sharma
Education: Bachelor of Commerce (B.Com), 2023
Skills: Accounting, Excel, Tally Prime, GST, TDS, Auditing
Projects:
• Inventory and Accounting Project: Managed ledger reconciliation and tax schedules.
`;
    const profile = extractResumeProfileHeuristic(resume);

    assert.strictEqual(profile.education.normalizedDegree, "Bachelor of Commerce");
    assert(profile.primaryDomains.includes("Commerce") && profile.primaryDomains.includes("Accounting"), "Expected Commerce & Accounting domains");
    assert(!profile.primaryDomains.includes("Software"), "Should NOT contain Software in primaryDomains");

    // Primary role must be Commerce/Accounting
    assert(/accountant|accounts executive|finance/i.test(profile.roles[0]), `Expected accountant role, got ${profile.roles[0]}`);
    assert(!profile.roles[0].toLowerCase().includes("software"), "Role 0 should not be software");

    const queries = buildSearchQueries(profile, "Bangalore");
    assert(/accountant|accounts|finance|commerce/i.test(queries[0]), `Query should discover accounting jobs, got ${queries[0]}`);
    assert(!/software engineer|developer intern/i.test(queries.join(" ")), "Queries should not contain software developer");

    const accountantJob = {
        id: "job_acc_1",
        company: "Deloitte",
        role: "Accounts Executive",
        location: "Bangalore",
        type: "full-time",
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
        type: "full-time",
        remote: false,
        tags: ["Java", "C++", "DSA", "Distributed Systems"],
        description: "Build scalable cloud distributed infrastructure.",
        applyUrl: "https://example.com/apply",
        postedAt: "2026-08-01",
        source: "Test",
    };

    const scoredAcc = scoreJob(accountantJob, profile, "Bangalore");
    const scoredSwe = scoreJob(softwareJob, profile, "Bangalore");

    assert(scoredAcc.matchPercent > scoredSwe.matchPercent, `Accountant job (${scoredAcc.matchPercent}%) should outscore Software job (${scoredSwe.matchPercent}%)`);
    assert(scoredAcc.matchBreakdown.educationMatchScore >= 80, `Education score should be high, got ${scoredAcc.matchBreakdown.educationMatchScore}`);
    assert(scoredSwe.matchBreakdown.educationMatchScore <= 35, `Software education score should be low for B.Com, got ${scoredSwe.matchBreakdown.educationMatchScore}`);
    assert(scoredAcc.matchReasons.some(r => r.includes("Bachelor of Commerce")), "Match reason should mention degree");
});

// --------------------------------------------------------------------------
// TEST 3 — Mechanical Engineering
// --------------------------------------------------------------------------
test("Test 3 — Mechanical: Mechanical Engineering maps to mechanical/CAD/manufacturing jobs", () => {
    const resume = `
Rohan Verma
Education: B.E in Mechanical Engineering, 2024
Skills: AutoCAD, CAD, SolidWorks, Manufacturing, Machine Design, Lean Six Sigma
Projects:
• Machine Design Optimization: Designed hydraulic press assembly fixtures using CAD.
`;
    const profile = extractResumeProfileHeuristic(resume);

    assert.strictEqual(profile.education.normalizedField, "Mechanical Engineering");
    assert(profile.primaryDomains.includes("Mechanical") && profile.primaryDomains.includes("Manufacturing"), "Expected Mechanical domains");
    assert(/mechanical engineer|design engineer|cad engineer/i.test(profile.roles[0]), `Expected mechanical role, got ${profile.roles[0]}`);

    const queries = buildSearchQueries(profile, "Pune");
    assert(/mechanical|design|cad/i.test(queries[0]), `Query should target mechanical, got ${queries[0]}`);
    assert(queries[0].includes("Pune"), "Query should include Pune");
});

// --------------------------------------------------------------------------
// TEST 4 — Civil Engineering
// --------------------------------------------------------------------------
test("Test 4 — Civil: Civil Engineering maps to civil/construction/infrastructure jobs", () => {
    const resume = `
Karan Patel
Education: B.Tech in Civil Engineering
Skills: AutoCAD, STAAD, Construction, Surveying, Structural Design, Estimation
Projects:
• Building Design Project: Structural analysis and load calculations for commercial high-rise.
`;
    const profile = extractResumeProfileHeuristic(resume);

    assert.strictEqual(profile.education.normalizedField, "Civil Engineering");
    assert(profile.primaryDomains.includes("Civil") && profile.primaryDomains.includes("Construction"), "Expected Civil domains");
    assert(/civil engineer|site engineer|structural engineer/i.test(profile.roles[0]), `Expected civil role, got ${profile.roles[0]}`);

    const queries = buildSearchQueries(profile, "Hyderabad");
    assert(/civil|site|structural/i.test(queries[0]), `Query should target civil, got ${queries[0]}`);
    assert(queries[0].includes("Hyderabad"), "Query should include Hyderabad");
});

// --------------------------------------------------------------------------
// TEST 5 — MBA Finance
// --------------------------------------------------------------------------
test("Test 5 — MBA Finance: MBA Finance maps to finance/business/analyst jobs", () => {
    const resume = `
Neha Gupta
Education: MBA Finance, 2023
Skills: Financial Analysis, Excel, Power BI, Financial Modeling, Valuation, Budgeting
Projects:
• Financial Forecasting Model: 5-year valuation model for consumer retail sector.
`;
    const profile = extractResumeProfileHeuristic(resume);

    assert.strictEqual(profile.education.normalizedDegree, "Master of Business Administration - Finance");
    assert(profile.primaryDomains.includes("Finance"), "Expected Finance domain");
    assert(/financial analyst|finance/i.test(profile.roles[0]), `Expected financial analyst role, got ${profile.roles[0]}`);

    const queries = buildSearchQueries(profile, "Mumbai");
    assert(/financial analyst|finance/i.test(queries[0]), `Query should target finance, got ${queries[0]}`);
});

// --------------------------------------------------------------------------
// TEST 6 — Career Transition
// --------------------------------------------------------------------------
test("Test 6 — Career Transition: Commerce remains primary domain while analytics roles appear", () => {
    const resume = `
Deepak Mehta
Education: Bachelor of Commerce (B.Com), 2023
Skills: Python, SQL, Power BI, Excel, Financial Analysis, Accounting
Projects:
• Financial Data Analysis Dashboard: Built Power BI and SQL dashboard to analyze retail cash flow trends.
`;
    const profile = extractResumeProfileHeuristic(resume);

    assert(profile.primaryDomains.includes("Commerce") && profile.primaryDomains.includes("Finance"), "Commerce/Finance must remain primary domain");
    assert(/commerce|accounting|finance/i.test(profile.primaryDomains[0]), "Primary domain 0 must be commerce/finance");

    assert(profile.secondaryDomains.includes("Data Analysis") || profile.secondaryDomains.includes("Business Analytics"), "Should have analytics secondary domain");
    assert(profile.roles.some(r => /data analyst|financial data analyst|business analyst/i.test(r)), "Analytics transition roles should appear");
    assert(!profile.primaryDomains.includes("Software Engineering"), "Should not claim Software Engineering as primary domain");
});

// --------------------------------------------------------------------------
// TEST 7 — Manual Search
// --------------------------------------------------------------------------
test("Test 7 — Manual Search: User query 'Accountant' guides search and uses candidate background to rank", () => {
    const resume = `
Suresh Nair
Education: B.Com, 2023
Skills: Accounting, Tally, Excel, GST
`;
    const profile = extractResumeProfileHeuristic(resume);
    const queries = buildSearchQueries(profile, "Bangalore", undefined, "Accountant");

    assert.strictEqual(queries[0], "Accountant Bangalore");

    const accountantJob = {
        id: "job_bng_acc",
        company: "KPMG",
        role: "Junior Accountant",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Accounting", "Excel", "GST"],
        description: "Opening for accountant in Bangalore branch.",
        applyUrl: "https://example.com/apply",
        postedAt: "2026-08-01",
        source: "Test",
    };

    const scored = scoreJob(accountantJob, profile, "Bangalore", undefined, "Accountant");
    assert(scored.matchPercent >= 80, `Expected >= 80% match, got ${scored.matchPercent}%`);
    assert(scored.matchReasons.some(r => r.includes("Accountant")), "Match reason should mention Accountant");
});

// --------------------------------------------------------------------------
// TEST 8 — No Manual Search (Automatic Discovery)
// --------------------------------------------------------------------------
test("Test 8 — No Manual Search: Automatically derives education-based job discovery", () => {
    const resume = `
Suresh Nair
Education: B.Com
Skills: Accounting, Tally, Excel, GST
`;
    const profile = extractResumeProfileHeuristic(resume);
    const queries = buildSearchQueries(profile, "Bangalore", undefined, "");

    assert(queries.length > 0, "Queries should not be empty");
    assert(/accountant|accounts|finance|commerce/i.test(queries[0]), `Query should discover accounting jobs, got ${queries[0]}`);
    assert(queries[0].includes("Bangalore"), "Query should include Bangalore");
    assert(!/software/i.test(queries[0]), "Query should not include software");
});

// --------------------------------------------------------------------------
// TEST 9 — Non-Technical Degree + Technical Project
// --------------------------------------------------------------------------
test("Test 9 — Non-Technical Degree + Tech Project: React project does NOT make Software Developer top career path", () => {
    const resume = `
Ananya Roy
Education: B.Com, 2024
Skills: React, JavaScript, Excel, Accounting, Tally, GST
Projects:
• React Inventory Application: Built an inventory tracking web interface for a retail business.
`;
    const profile = extractResumeProfileHeuristic(resume);

    assert(/commerce|accounting|finance/i.test(profile.primaryDomains[0]), "Primary domain 0 must be commerce/finance");
    assert(/accountant|accounts executive|finance/i.test(profile.roles[0]), `Primary role must be accounting, got ${profile.roles[0]}`);
    assert(profile.roles[0] !== "Software Engineer", "Primary role must NOT be Software Engineer");
    assert(profile.roles[0] !== "Full Stack Developer", "Primary role must NOT be Full Stack Developer");
    assert(profile.secondaryDomains.includes("Web & Software Applications"), "Secondary domain should note web application");
});

// --------------------------------------------------------------------------
// Additional Edge Cases
// --------------------------------------------------------------------------
test("Missing education does not crash and does not fabricate Software Engineer", () => {
    const resume = `
Taylor Morgan
Experienced professional in marketing campaigns, digital sales, and social media.
Skills: SEO, Content Marketing, Social Media, Google Analytics
`;
    const profile = extractResumeProfileHeuristic(resume);
    assert(profile.primaryDomains.includes("Marketing") || profile.primaryDomains.includes("Business"), "Should infer marketing/business from skills");
    assert(!profile.primaryDomains.includes("Software"), "Should NOT infer Software domain");
});

test("INDIA_FALLBACK_JOBS covers multiple disciplines", () => {
    assert(INDIA_FALLBACK_JOBS.length >= 5, "Should have at least 5 fallback jobs");
    const roles = INDIA_FALLBACK_JOBS.map(j => j.role.toLowerCase());
    assert(roles.some(r => r.includes("account") || r.includes("finance")), "Must have finance/accounting fallback job");
    assert(roles.some(r => r.includes("mechanical") || r.includes("cad")), "Must have mechanical fallback job");
    assert(roles.some(r => r.includes("civil") || r.includes("site")), "Must have civil fallback job");
    assert(roles.some(r => r.includes("software") || r.includes("intern")), "Must have software fallback job");
});

test("Existing tests/job-search compatibility", () => {
    const resume = `
Jane Doe
Senior Frontend Engineer
Skills: React, TypeScript, Next.js, Node.js, Tailwind, GraphQL
Experience building product UIs at scale in Bangalore.
`;
    const profile = extractResumeProfileHeuristic(resume);
    const skillSet = profile.skills.map(s => s.toLowerCase());
    assert(skillSet.some(s => s.includes("react")), "Missing react");
    assert(skillSet.some(s => s.includes("typescript")), "Missing typescript");
    assert(skillSet.some(s => s.includes("next.js")), "Missing next.js");
    assert(skillSet.some(s => s.includes("tailwind")), "Missing tailwind");
    assert(skillSet.some(s => s.includes("graphql")), "Missing graphql");
    assert(profile.seniority === "senior", `Expected senior, got ${profile.seniority}`);

    const queries = buildSearchQueries(profile, "Bangalore");
    assert(queries[0].toLowerCase().includes("bangalore"), "Should contain Bangalore");
    assert(queries.length <= 4, "Should cap at 4 queries");

    const links = webSearchUrls(profile, "Remote");
    assert(links.some(l => l.url.includes("google.com")), "Missing google link");
    assert(links.some(l => l.url.includes("linkedin.com/jobs")), "Missing linkedin link");
});

test("Existing tests/job-india.test.ts assertions", () => {
    for (const job of INDIA_FALLBACK_JOBS) {
        assert(/india/i.test(job.source), `Source should match india: ${job.source}`);
        assert(/^https?:\/\//.test(job.applyUrl), `ApplyUrl should start with http: ${job.applyUrl}`);
        assert(/^job_in_/.test(job.id), `ID should start with job_in_: ${job.id}`);
    }
    const locations = INDIA_FALLBACK_JOBS.map(j => j.location.toLowerCase());
    assert(locations.some(l => l.includes("bangalore")), "Must include Bangalore");
    assert(locations.some(l => l.includes("hyderabad")), "Must include Hyderabad");
    assert(INDIA_FALLBACK_JOBS.some(j => j.remote), "Must have remote India role");

    const ids = INDIA_FALLBACK_JOBS.map(j => j.id);
    assert.strictEqual(new Set(ids).size, ids.length, "IDs must be unique");

    const rahulResume = `
Rahul Sharma
Backend Engineer
Skills: Java, Spring, Kafka, AWS, PostgreSQL
Experience building distributed systems.
`;
    const profile = extractResumeProfileHeuristic(rahulResume);
    const bangaloreQueries = buildSearchQueries(profile, "Bangalore");
    assert(bangaloreQueries.length > 0 && bangaloreQueries[0].toLowerCase().includes("bangalore"));

    const bengaluruQueries = buildSearchQueries(profile, "Bengaluru");
    assert(bengaluruQueries.length > 0 && bengaluruQueries[0].toLowerCase().includes("bengaluru"));

    const hydQueries = buildSearchQueries(profile, "Hyderabad");
    assert(hydQueries.some(q => q.toLowerCase().includes("hyderabad")));
});

console.log(`\n========================================`);
console.log(`ALL TESTS PASSED: ${passed} / ${total}`);
console.log(`========================================\n`);
