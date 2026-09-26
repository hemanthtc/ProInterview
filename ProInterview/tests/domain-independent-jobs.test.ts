import { describe, it, expect } from "vitest";
import {
    extractResumeProfileHeuristic,
    buildSearchQueries,
    webSearchUrls,
} from "../src/utils/jobSearch";

describe("Domain-Independent Resume Profiling & Job Search", () => {
    // ------------------------------------------------------------------------
    // Test 1 — Software
    // ------------------------------------------------------------------------
    describe("Test 1 — Software Resume", () => {
        const softwareResume = `
Alex Kumar
B.E. Computer Science
Skills: React, Node.js, TypeScript, MongoDB, Express, Docker
Experience: Developed full-stack web applications and microservices in Bangalore.
`;

        it("extracts Software & IT domain with software roles", () => {
            const profile = extractResumeProfileHeuristic(softwareResume);
            expect(profile.careerDomain).toBe("Software & IT");
            expect(profile.roles.some((r) => /software|frontend|backend|developer|engineer/i.test(r))).toBe(true);
            const skillsLower = profile.skills.map((s) => s.toLowerCase());
            expect(skillsLower).toEqual(expect.arrayContaining(["react", "node.js", "typescript", "mongodb"]));
        });

        it("builds domain-appropriate software search queries", () => {
            const profile = extractResumeProfileHeuristic(softwareResume);
            const queries = buildSearchQueries(profile, "Bangalore");
            expect(queries.length).toBeGreaterThan(0);
            expect(queries[0].toLowerCase()).toContain("bangalore");
            expect(queries.some((q) => /software|developer|engineer|react|node/i.test(q))).toBe(true);
        });
    });

    // ------------------------------------------------------------------------
    // Test 2 — Mechanical
    // ------------------------------------------------------------------------
    describe("Test 2 — Mechanical Resume", () => {
        const mechanicalResume = `
Suresh Patil
B.E. Mechanical Engineering
Skills: AutoCAD, SolidWorks, GD&T, ANSYS, Manufacturing Processes, CNC Machining
Experience: Manufacturing internship and production project optimizing assembly line cycle time in Pune.
`;

        it("extracts Mechanical Engineering domain with mechanical roles", () => {
            const profile = extractResumeProfileHeuristic(mechanicalResume);
            expect(profile.careerDomain).toBe("Mechanical Engineering");
            expect(profile.roles.some((r) => /mechanical|design|production|manufacturing|cad/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
            expect(profile.roles).not.toContain("Software Developer");
            expect(profile.roles).not.toContain("SDE");
        });

        it("extracts mechanical skills and tools", () => {
            const profile = extractResumeProfileHeuristic(mechanicalResume);
            const toolsAndSkills = [...profile.skills, ...(profile.toolsAndTechnologies || [])].map((s) => s.toLowerCase());
            expect(toolsAndSkills).toEqual(expect.arrayContaining(["autocad", "solidworks", "ansys"]));
        });

        it("builds queries for mechanical roles without software injection", () => {
            const profile = extractResumeProfileHeuristic(mechanicalResume);
            const queries = buildSearchQueries(profile, "Pune", "intern");
            expect(queries.length).toBeGreaterThan(0);
            for (const q of queries) {
                expect(q.toLowerCase()).not.toContain("software engineering intern");
                expect(q.toLowerCase()).not.toContain("developer intern");
            }
            expect(queries.some((q) => /mechanical|design|production|cad|internship/i.test(q))).toBe(true);
        });

        it("generates mechanical web search links", () => {
            const profile = extractResumeProfileHeuristic(mechanicalResume);
            const links = webSearchUrls(profile, "Pune");
            for (const link of links) {
                expect(link.url.toLowerCase()).not.toContain("software+engineer");
                expect(link.url.toLowerCase()).not.toContain("software%20engineer");
            }
        });
    });

    // ------------------------------------------------------------------------
    // Test 3 — Civil
    // ------------------------------------------------------------------------
    describe("Test 3 — Civil Resume", () => {
        const civilResume = `
Ramesh Verma
B.E. Civil Engineering
Skills: AutoCAD, STAAD.Pro, Site Supervision, Quantity Estimation, Bar Bending Schedule, RCC Design
Experience: Site engineer on commercial building project in Hyderabad. Monitored concrete pours and reinforcement detailing.
`;

        it("extracts Civil Engineering domain with civil/site/structural roles", () => {
            const profile = extractResumeProfileHeuristic(civilResume);
            expect(profile.careerDomain).toBe("Civil Engineering");
            expect(profile.roles.some((r) => /civil|site|structural|quantity/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("extracts civil tools including STAAD.Pro", () => {
            const profile = extractResumeProfileHeuristic(civilResume);
            const toolsAndSkills = [...profile.skills, ...(profile.toolsAndTechnologies || [])].map((s) => s.toLowerCase());
            expect(toolsAndSkills).toEqual(expect.arrayContaining(["autocad", "staad.pro"]));
        });
    });

    // ------------------------------------------------------------------------
    // Test 4 — Finance
    // ------------------------------------------------------------------------
    describe("Test 4 — Finance Resume", () => {
        const financeResume = `
Pooja Mehta
B.Com in Accounting and Finance
Skills: Accounting, Excel, Tally, Financial Analysis, GST, TDS, Bank Reconciliation
Experience: Managed accounts payable/receivable, ledger reconciliation, and GST tax filings in Mumbai.
`;

        it("extracts Finance & Accounting domain with financial roles", () => {
            const profile = extractResumeProfileHeuristic(financeResume);
            expect(profile.careerDomain).toBe("Finance & Accounting");
            expect(profile.roles.some((r) => /financial|accountant|accounts|finance|audit|tax/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("extracts finance tools and skills", () => {
            const profile = extractResumeProfileHeuristic(financeResume);
            const toolsAndSkills = [...profile.skills, ...(profile.toolsAndTechnologies || [])].map((s) => s.toLowerCase());
            expect(toolsAndSkills).toEqual(expect.arrayContaining(["accounting", "tally", "excel", "gst"]));
        });
    });

    // ------------------------------------------------------------------------
    // Test 5 — Human Resources (HR)
    // ------------------------------------------------------------------------
    describe("Test 5 — HR Resume", () => {
        const hrResume = `
Ananya Sen
MBA in Human Resources
Skills: Recruitment, Employee Relations, Payroll, Talent Acquisition, Sourcing, Screening, Onboarding
Experience: Managed end-to-end talent acquisition and campus hiring drives in Delhi NCR.
`;

        it("extracts Human Resources domain with HR roles", () => {
            const profile = extractResumeProfileHeuristic(hrResume);
            expect(profile.careerDomain).toBe("Human Resources");
            expect(profile.roles.some((r) => /hr|recruiter|talent acquisition|people operations/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("extracts HR skills", () => {
            const profile = extractResumeProfileHeuristic(hrResume);
            const skillsLower = profile.skills.map((s) => s.toLowerCase());
            expect(skillsLower).toEqual(expect.arrayContaining(["recruitment", "talent acquisition", "payroll"]));
        });
    });

    // ------------------------------------------------------------------------
    // Test 6 — Marketing
    // ------------------------------------------------------------------------
    describe("Test 6 — Marketing Resume", () => {
        const marketingResume = `
Rohit Gupta
MBA in Marketing
Skills: SEO, Google Ads, Content Marketing, Social Media Marketing, SEM, Copywriting, Marketing Analytics
Experience: Spearheaded digital campaigns, organic traffic optimization, and performance marketing in Gurgaon.
`;

        it("extracts Marketing domain with marketing roles", () => {
            const profile = extractResumeProfileHeuristic(marketingResume);
            expect(profile.careerDomain).toBe("Marketing");
            expect(profile.roles.some((r) => /marketing|seo|content|digital marketing/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("extracts marketing skills", () => {
            const profile = extractResumeProfileHeuristic(marketingResume);
            const skillsLower = profile.skills.map((s) => s.toLowerCase());
            expect(skillsLower).toEqual(expect.arrayContaining(["seo", "google ads", "content marketing"]));
        });
    });

    // ------------------------------------------------------------------------
    // Test 7 — Electronics & Embedded
    // ------------------------------------------------------------------------
    describe("Test 7 — Electronics Resume", () => {
        const electronicsResume = `
Vikram Rao
B.E. Electronics and Communication (ECE)
Skills: Embedded C, Microcontrollers, PCB Design, ARM Cortex, RTOS, IoT, SPI, I2C, UART
Experience: Firmware development on STM32 microcontrollers and board bring-up in Bangalore.
`;

        it("extracts Electronics & Embedded Systems domain with embedded roles", () => {
            const profile = extractResumeProfileHeuristic(electronicsResume);
            expect(profile.careerDomain).toBe("Electronics & Embedded Systems");
            expect(profile.roles.some((r) => /embedded|electronics|firmware|hardware|iot/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("extracts embedded skills and protocols", () => {
            const profile = extractResumeProfileHeuristic(electronicsResume);
            const toolsAndSkills = [...profile.skills, ...(profile.toolsAndTechnologies || [])].map((s) => s.toLowerCase());
            expect(toolsAndSkills).toEqual(expect.arrayContaining(["embedded c", "microcontrollers", "pcb design", "arm cortex"]));
        });
    });

    // ------------------------------------------------------------------------
    // Test 8 — Education & Teaching
    // ------------------------------------------------------------------------
    describe("Test 8 — Education Resume", () => {
        const educationResume = `
Dr. Shalini Roy
M.Sc Mathematics, B.Ed
Skills: Lesson Planning, Classroom Management, Pedagogy, Curriculum Design, Student Assessment, STEM Education
Experience: High school mathematics teacher and academic coordinator preparing students for board exams.
`;

        it("extracts Education & Teaching domain with educator roles", () => {
            const profile = extractResumeProfileHeuristic(educationResume);
            expect(profile.careerDomain).toBe("Education & Teaching");
            expect(profile.roles.some((r) => /teacher|lecturer|academic coordinator|tutor|curriculum/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("extracts educational pedagogy skills", () => {
            const profile = extractResumeProfileHeuristic(educationResume);
            const skillsLower = profile.skills.map((s) => s.toLowerCase());
            expect(skillsLower).toEqual(expect.arrayContaining(["lesson planning", "curriculum design", "classroom management"]));
        });
    });

    // ------------------------------------------------------------------------
    // Test 9 — Healthcare
    // ------------------------------------------------------------------------
    describe("Test 9 — Healthcare Resume", () => {
        const healthcareResume = `
Dr. Arun Nair
MBBS, Registered Medical Practitioner
Skills: Patient Care, Clinical Diagnosis, Emergency Response, Vital Signs Monitoring, EMR Documentation
Experience: Resident Medical Officer managing inpatient wards and outpatient consultations at Apollo Hospitals.
`;

        it("extracts Healthcare domain with clinical roles", () => {
            const profile = extractResumeProfileHeuristic(healthcareResume);
            expect(profile.careerDomain).toBe("Healthcare");
            expect(profile.roles.some((r) => /doctor|medical officer|clinical|resident/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("extracts healthcare clinical skills", () => {
            const profile = extractResumeProfileHeuristic(healthcareResume);
            const skillsLower = profile.skills.map((s) => s.toLowerCase());
            expect(skillsLower).toEqual(expect.arrayContaining(["patient care", "clinical diagnosis", "emergency response"]));
        });
    });

    // ------------------------------------------------------------------------
    // Test 10 — Multi-Domain Resume (Mechanical Degree + Python/Data)
    // ------------------------------------------------------------------------
    describe("Test 10 — Multi-Domain Resume", () => {
        const multiDomainResume = `
Aditya Deshmukh
B.E. Mechanical Engineering
Skills: SolidWorks, AutoCAD, Manufacturing Processes, Python, Data Analysis, Excel
Experience: Mechanical engineering intern with experience using Python scripts for manufacturing data analysis.
`;

        it("identifies Mechanical Engineering as primary domain while noting analytical skills", () => {
            const profile = extractResumeProfileHeuristic(multiDomainResume);
            expect(profile.careerDomain).toBe("Mechanical Engineering");
            expect(profile.roles).not.toContain("Software Engineer");
            expect(profile.roles.some((r) => /mechanical|design|production/i.test(r))).toBe(true);
        });
    });

    // ------------------------------------------------------------------------
    // Test 11 — Fresher / Student Handling
    // ------------------------------------------------------------------------
    describe("Test 11 — Fresher / Student Profile", () => {
        const fresherResume = `
Neha Kulkarni
B.E. Mechanical Engineering (Fresher 2026)
Skills: AutoCAD, SolidWorks, GD&T, Thermodynamics
Projects: CAD design of automated gearbox assembly. Manufacturing internship at auto ancillaries.
`;

        it("correctly identifies entry/intern seniority and mechanical target roles", () => {
            const profile = extractResumeProfileHeuristic(fresherResume);
            expect(profile.careerDomain).toBe("Mechanical Engineering");
            expect(["entry", "intern", "junior"]).toContain(profile.seniority);
            expect(profile.roles.some((r) => /mechanical|design|production|cad/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });
    });

    // ------------------------------------------------------------------------
    // Test 12 — Negative Test: ZERO Software Fallbacks for Non-Software Candidates
    // ------------------------------------------------------------------------
    describe("Test 12 — Negative Test: No Software Fallback for Non-Software Domains", () => {
        const resumes = [
            { domain: "Mechanical", text: "B.E. Mechanical Engineering, AutoCAD, SolidWorks, Manufacturing" },
            { domain: "Civil", text: "B.E. Civil Engineering, STAAD.Pro, Site Execution, Quantity Estimation" },
            { domain: "Finance", text: "B.Com, Accounting, Tally Prime, GST, Financial Modeling, Balance Sheet" },
            { domain: "HR", text: "MBA HR, Recruitment, Talent Acquisition, Payroll Processing, Employee Relations" },
            { domain: "Marketing", text: "MBA Marketing, SEO, Google Ads, Social Media Marketing, Content Strategy" },
            { domain: "Education", text: "B.Ed, M.Sc Mathematics, Lesson Planning, Pedagogy, Teaching" },
            { domain: "Healthcare", text: "MBBS, Clinical Diagnosis, Patient Care, Inpatient Care, Hospital" },
        ];

        for (const { domain, text } of resumes) {
            it(`strictly prevents Software Engineer fallback for ${domain} resume`, () => {
                const profile = extractResumeProfileHeuristic(text);
                expect(profile.roles).not.toContain("Software Engineer");
                expect(profile.roles).not.toContain("Software Developer");
                expect(profile.roles).not.toContain("SDE");
                expect(profile.careerDomain).not.toBe("Software & IT");

                const queries = buildSearchQueries(profile, "Bangalore", "intern");
                for (const q of queries) {
                    expect(q.toLowerCase()).not.toContain("software engineering intern");
                    expect(q.toLowerCase()).not.toContain("developer intern");
                }

                const searchUrls = webSearchUrls(profile, "Bangalore");
                for (const link of searchUrls) {
                    expect(link.url.toLowerCase()).not.toContain("software+engineer");
                    expect(link.url.toLowerCase()).not.toContain("software%20engineer");
                }
            });
        }
    });

    // ------------------------------------------------------------------------
    // Test 13 — User-Specified Target Domain Input & Deep Resume Matching
    // ------------------------------------------------------------------------
    describe("Test 13 — User-Specified Target Domain Input & Deep Resume Matching", () => {
        const generalResumeWithProjects = `
Ananya Sharma
Education: B.Tech in Mechanical Engineering, 2023
Projects:
- Design and Optimization of Solar Thermal Heat Exchanger using ANSYS and SolidWorks
- Autonomous Mobile Robot navigation chassis fabrication
Skills: SolidWorks, ANSYS, AutoCAD, Python, Data Analysis
Experience: 1 year as Junior Project Trainee
`;

        it("respects typed target domain override when candidate specifies Mechanical Engineering", () => {
            const profile = extractResumeProfileHeuristic(generalResumeWithProjects, "Mechanical Engineering");
            expect(profile.isUserSpecified).toBe(true);
            expect(profile.targetDomain).toBe("Mechanical Engineering");
            expect(profile.careerDomain).toBe("Mechanical Engineering");
            expect(profile.roles.some((r) => /mechanical|design|cad|production/i.test(r))).toBe(true);
            expect(profile.education && profile.education.length > 0).toBe(true);
            expect(profile.projects && profile.projects.length > 0).toBe(true);
        });

        it("steers domain when candidate with mixed background specifies Finance", () => {
            const mixedResume = `
Rahul Joshi
B.E. with interest in corporate banking and equity research.
Projects: Financial valuation model for tech startup.
Skills: Financial Modeling, DCF, Excel, Valuation, Python.
`;
            const profile = extractResumeProfileHeuristic(mixedResume, "Finance");
            expect(profile.isUserSpecified).toBe(true);
            expect(profile.careerDomain).toMatch(/finance/i);
            expect(profile.roles.some((r) => /financial|analyst|accountant|finance/i.test(r))).toBe(true);
            expect(profile.roles).not.toContain("Software Engineer");
        });

        it("handles custom domain typed by user outside predefined taxonomy", () => {
            const profile = extractResumeProfileHeuristic(generalResumeWithProjects, "Renewable Energy");
            expect(profile.isUserSpecified).toBe(true);
            expect(profile.careerDomain).toBe("Renewable Energy");
            expect(profile.roles[0]).toContain("Renewable Energy");
            const queries = buildSearchQueries(profile, "Pune");
            expect(queries[0].toLowerCase()).toContain("renewable energy");
        });

        it("runs deep autonomous resume scan when target domain is left empty", () => {
            const profile = extractResumeProfileHeuristic(generalResumeWithProjects, "");
            expect(profile.isUserSpecified).toBe(false);
            expect(profile.careerDomain).toBe("Mechanical Engineering");
            expect(profile.education).toEqual(expect.arrayContaining([expect.stringMatching(/mechanical/i)]));
            expect(profile.projects).toBeDefined();
            expect(profile.projects!.some((p) => /solar|heat exchanger|ansys/i.test(p))).toBe(true);
        });
    });
});
