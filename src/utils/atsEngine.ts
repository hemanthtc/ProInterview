import { extractResumeProfileHeuristic } from "./jobSearch";
import { matchesSkillToken, normalizeSkillToken } from "./tokenMatching";

export interface ParsedJdRequirements {
    roleTitle: string;
    requiredDegrees: string[];
    mandatoryDegree: boolean;
    requiredSkills: string[];
    preferredSkills: string[];
    minYearsExperience: number;
    mandatoryExperience: boolean;
    certifications: string[];
    mandatoryCertifications: boolean;
    responsibilities: string[];
    industryDomain: string;
    isLimitedJd: boolean;
}

export interface DeterministicAtsResult {
    matchPercent: number;
    readyForMock: boolean;
    summaryVerdict: string;
    breakdown: {
        skillsMatch: number;
        experienceMatch: number;
        toolsMatch: number;
        educationMatch: number;
    };
    keywordHits: string[];
    keywordGaps: string[];
    sectionAdvice: string[];
    rewrittenBullets: string[];
    weightsUsed: {
        skills: number;
        experience: number;
        responsibilities: number;
        education: number;
        certifications: number;
        preferred: number;
    };
    isFallback?: boolean;
}

// Common industry skill terms
const KNOWN_SKILL_KEYWORDS = [
    // Technical / Programming / Data
    "javascript", "typescript", "python", "java", "c++", "c#", "golang", "go", "rust", "php",
    "react", "next.js", "angular", "vue", "node.js", "nodejs", "express", "django", "spring boot", "spring",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "azure", "gcp", "docker", "kubernetes",
    "power bi", "tableau", "excel", "pandas", "machine learning", "deep learning", "git", "linux", "rest api",
    "graphql", "kafka", "dynamodb", "terraform", "ci/cd", "jenkins", "ansible",
    // Mobile & UI/UX
    "flutter", "react native", "swift", "kotlin", "ios", "android", "figma", "ui/ux", "wireframing",
    // Electronics / VLSI / Embedded / Hardware
    "cadence virtuoso", "cadence", "virtuoso", "analog layout", "physical design", "fpga", "vhdl", "verilog",
    "systemverilog", "drc", "lvs", "cmos", "floorplanning", "placement", "routing", "clock tree synthesis",
    "cts", "timing analysis", "sta", "dft", "atpg", "embedded systems", "microcontroller", "iiot", "iot",
    "pcb design", "matlab", "simulink", "vlsi", "arm", "rtos", "dsp", "arduino", "asic", "rtl",
    // Accounting / Finance
    "accounting", "financial accounting", "management accounting", "gst", "tds", "income tax", "direct tax",
    "indirect tax", "auditing", "statutory audit", "internal audit", "tally", "tally prime", "financial analysis",
    "financial modeling", "budgeting", "forecasting", "bank reconciliation", "balance sheet", "p&l", "cost accounting",
    "payroll", "accounts payable", "accounts receivable", "sap", "quickbooks", "corporate finance",
    // Mechanical / Manufacturing
    "autocad", "solidworks", "catia", "ansys", "manufacturing", "lean manufacturing", "six sigma", "5s", "kaizen",
    "cnc", "machining", "quality control", "quality assurance", "production planning", "hvac", "thermodynamics",
    "hydraulics", "pneumatics", "machine design", "geometric dimensioning", "tolerance stackup",
    // Civil / Construction
    "civil engineering", "staad", "staad pro", "revit", "surveying", "structural design", "structural analysis",
    "construction supervision", "site engineering", "estimation", "bill of quantities", "boq", "bar bending schedule",
    "concrete technology", "geotechnical", "etabs", "primavera",
    // Healthcare / Pharmacy
    "pharmaceutical", "pharmacology", "gmp", "cgmp", "quality control", "clinical research", "clinical trials",
    "pharmacovigilance", "formulation", "hplc", "gc-ms", "spectrophotometry", "biochemistry", "microbiology",
    // Business / Marketing / HR
    "marketing", "digital marketing", "seo", "sem", "social media marketing", "content marketing", "sales",
    "business development", "lead generation", "human resources", "recruitment", "talent acquisition", "operations management",
    "supply chain", "logistics", "procurement", "vendor management", "customer relationship"
];

/**
 * Extracts and classifies requirements from a Job Description into Required vs Preferred.
 */
export function parseJobDescription(jobDescription: string, roleTitle: string = ""): ParsedJdRequirements {
    const jdClean = (jobDescription || "").trim();
    const isLimited = jdClean.length < 150;
    const jdLower = jdClean.toLowerCase();

    // 1. Detect Required vs Preferred sections
    const lines = jdClean.split(/\r?\n/);
    const requiredLines: string[] = [];
    const preferredLines: string[] = [];
    const generalLines: string[] = [];

    let currentSection: "required" | "preferred" | "general" = "general";

    for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        if (/^(required|requirements|must\s+have|minimum\s+qualifications|basic\s+qualifications|essential\s+skills|what\s+you\s+need|who\s+you\s+are):?/i.test(lowerLine)) {
            currentSection = "required";
            continue;
        } else if (/^(preferred|nice\s+to\s+have|good\s+to\s+have|desired|bonus|plus|preferred\s+qualifications):?/i.test(lowerLine)) {
            currentSection = "preferred";
            continue;
        } else if (/^(responsibilities|what\s+you\s*will\s*do|role|about|duties|overview):?/i.test(lowerLine)) {
            currentSection = "general";
            continue;
        }

        if (currentSection === "required") requiredLines.push(line);
        else if (currentSection === "preferred") preferredLines.push(line);
        else generalLines.push(line);
    }

    const requiredText = requiredLines.join("\n").toLowerCase();
    const preferredText = preferredLines.join("\n").toLowerCase();
    const allText = jdLower;

    // 2. Degree requirements
    const requiredDegrees: string[] = [];
    let mandatoryDegree = false;

    if (/\b(must\s+have|mandatory|required|minimum)\s+(?:a\s+)?(b\.?com|b\.?tech|b\.?e|mba|m\.?com|bba|bca|mca|b\.?sc|b\.?pharm|b\.?arch|degree|bachelor['’]?s|master['’]?s)\b/i.test(allText)) {
        mandatoryDegree = true;
    }

    const degreePatterns: Array<{ name: string; pattern: RegExp }> = [
        { name: "Bachelor of Commerce (B.Com)", pattern: /\b(b\.?\s*com|bachelor\s+of\s+commerce)\b/i },
        { name: "Master of Commerce (M.Com)", pattern: /\b(m\.?\s*com|master\s+of\s+commerce)\b/i },
        { name: "B.Tech / B.E Computer Science", pattern: /\b(b\.?\s*tech|b\.?\s*e\.?).*?(computer\s+science|cse|cs\b|software|information\s+technology|it\b)/i },
        { name: "B.Tech / B.E Mechanical Engineering", pattern: /\b(b\.?\s*tech|b\.?\s*e\.?).*?(mechanical|automobile|production)/i },
        { name: "B.Tech / B.E Civil Engineering", pattern: /\b(b\.?\s*tech|b\.?\s*e\.?).*?(civil|structural|construction)/i },
        { name: "B.Tech / B.E Electrical / Electronics / VLSI", pattern: /\b(b\.?\s*tech|b\.?\s*e\.?).*?(electrical|electronics|ece\b|eee\b|vlsi|embedded|telecommunication)/i },
        { name: "Diploma in Engineering", pattern: /\b(diploma|polytechnic).*?(electronics|electrical|mechanical|civil|engineering)/i },
        { name: "Master of Business Administration (MBA)", pattern: /\b(mba|master\s+of\s+business\s+administration|pgdm)\b/i },
        { name: "Bachelor of Business Administration (BBA)", pattern: /\b(bba|bachelor\s+of\s+business\s+administration|bms)\b/i },
        { name: "Bachelor of Computer Applications (BCA)", pattern: /\b(bca|bachelor\s+of\s+computer\s+applications)\b/i },
        { name: "Master of Computer Applications (MCA)", pattern: /\b(mca|master\s+of\s+computer\s+applications)\b/i },
        { name: "Bachelor of Pharmacy (B.Pharm)", pattern: /\b(b\.?\s*pharm|bachelor\s+of\s+pharmacy|pharm\.?\s*d)\b/i },
        { name: "Chartered Accountant (CA)", pattern: /\b(ca|chartered\s+accountant|cpa|acca|cma)\b/i },
        { name: "Bachelor's Degree", pattern: /\b(bachelor['’]?s\s+degree|undergraduate\s+degree|graduate\s+degree|any\s+degree)\b/i },
    ];

    for (const dp of degreePatterns) {
        if (dp.pattern.test(allText)) {
            requiredDegrees.push(dp.name);
        }
    }

    // 3. Experience requirements
    let minYearsExperience = 0;
    let mandatoryExperience = false;

    const expMatch = allText.match(/\b(\d+)\s*(?:\+|plus)?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+)?experience\b/i) ||
                     allText.match(/\bexperience\s*:\s*(\d+)\s*(?:\+|plus)?\s*(?:years?|yrs?)\b/i) ||
                     allText.match(/\bminimum\s+(?:of\s+)?(\d+)\s*(?:\+|plus)?\s*(?:years?|yrs?)\b/i);

    if (expMatch && expMatch[1]) {
        minYearsExperience = parseInt(expMatch[1], 10);
        if (allText.includes("mandatory") || allText.includes("must have") || allText.includes("minimum")) {
            mandatoryExperience = true;
        }
    }

    // 4. Skills extraction into Required vs Preferred
    const requiredSkills: string[] = [];
    const preferredSkills: string[] = [];

    // 4a. Direct skill line extraction (e.g., "Required Skills: A, B, C", "- Required Skills: ...")
    for (const line of lines) {
        const cleanL = line.replace(/^[•\-*▪▫–—✦✓]\s*/, "").trim();
        const reqSkillLineMatch = cleanL.match(/^(?:required|must\s+have|mandatory|technical|key)\s+skills?\s*[:\-]\s*(.+)$/i);
        if (reqSkillLineMatch) {
            const rawTokens = reqSkillLineMatch[1].split(/[,;•|]/);
            for (const rt of rawTokens) {
                const cleaned = rt.replace(/^[•\-*▪▫–—✦✓]\s*/, "").replace(/\([^)]*\)/g, "").replace(/\.$/, "").trim();
                if (cleaned.length >= 2 && cleaned.length <= 40 && !/^(and|or|etc|\d+\+?\s*years?)$/i.test(cleaned)) {
                    const knownMatch = KNOWN_SKILL_KEYWORDS.find(kw => matchesSkillToken(cleaned, kw));
                    if (knownMatch) {
                        requiredSkills.push(normalizeSkillToken(knownMatch));
                    } else {
                        requiredSkills.push(normalizeSkillToken(cleaned));
                    }
                }
            }
        }
        const prefSkillLineMatch = cleanL.match(/^(?:preferred|nice\s+to\s+have|good\s+to\s+have|bonus)\s+skills?\s*[:\-]\s*(.+)$/i);
        if (prefSkillLineMatch) {
            const rawTokens = prefSkillLineMatch[1].split(/[,;•|]/);
            for (const rt of rawTokens) {
                const cleaned = rt.replace(/^[•\-*▪▫–—✦✓]\s*/, "").replace(/\([^)]*\)/g, "").replace(/\.$/, "").trim();
                if (cleaned.length >= 2 && cleaned.length <= 40 && !/^(and|or|etc|\d+\+?\s*years?)$/i.test(cleaned)) {
                    const knownMatch = KNOWN_SKILL_KEYWORDS.find(kw => matchesSkillToken(cleaned, kw));
                    if (knownMatch) {
                        preferredSkills.push(normalizeSkillToken(knownMatch));
                    } else {
                        preferredSkills.push(normalizeSkillToken(cleaned));
                    }
                }
            }
        }
    }

    // 4b. Requirement bullet point extraction
    for (const rLine of requiredLines) {
        const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(rLine);
        const clean = rLine.replace(/^[•\-*▪▫–—✦✓]\s*/, "").replace(/\([^)]*\)/g, "").trim();
        if (isBullet && clean.length >= 2 && clean.length <= 40 && !/\b(degree|bachelor|master|diploma|years?|experience|communication|collaborat|team|responsib|qualifications)\b/i.test(clean)) {
            requiredSkills.push(normalizeSkillToken(clean));
        }
    }

    // 4c. Canonical keyword scanning across JD sections
    for (const kw of KNOWN_SKILL_KEYWORDS) {
        if (requiredText && matchesSkillToken(requiredText, kw)) {
            requiredSkills.push(normalizeSkillToken(kw));
        } else if (preferredText && matchesSkillToken(preferredText, kw)) {
            preferredSkills.push(normalizeSkillToken(kw));
        } else if (matchesSkillToken(allText, kw)) {
            const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const kwSentenceMatch = new RegExp(`(?:nice|good|preferred|plus)[^.\\n]*\\b${escapedKw}\\b`, "i").test(allText);
            if (kwSentenceMatch) {
                preferredSkills.push(normalizeSkillToken(kw));
            } else {
                requiredSkills.push(normalizeSkillToken(kw));
            }
        }
    }

    // 5. Certifications
    const certifications: string[] = [];
    let mandatoryCertifications = false;
    const certPatterns = ["cpa", "ca", "cfa", "acca", "aws certified", "pmp", "six sigma", "autodesk certified"];
    for (const cert of certPatterns) {
        if (matchesSkillToken(allText, cert)) {
            certifications.push(cert.toUpperCase());
            if (allText.includes("mandatory certification") || allText.includes("certified is required")) {
                mandatoryCertifications = true;
            }
        }
    }

    // 6. Industry domain detection
    let industryDomain = "General";
    if (/commerce|accounting|finance|audit|tax|banking/i.test(roleTitle + " " + allText)) industryDomain = "Commerce & Finance";
    else if (/software|developer|frontend|backend|cloud|fullstack|programming/i.test(roleTitle + " " + allText)) industryDomain = "Software & IT";
    else if (/electronics|vlsi|embedded|hardware|analog layout|physical design|semiconductor|fpga|microcontroller/i.test(roleTitle + " " + allText)) industryDomain = "Electronics & Hardware Engineering";
    else if (/mechanical|cad|solidworks|manufacturing|machining/i.test(roleTitle + " " + allText)) industryDomain = "Mechanical Engineering";
    else if (/civil|staad|construction|structural|site engineer/i.test(roleTitle + " " + allText)) industryDomain = "Civil Engineering";
    else if (/pharmacy|pharmacist|clinical|drug|pharma/i.test(roleTitle + " " + allText)) industryDomain = "Pharmacy & Life Sciences";
    else if (/marketing|seo|brand|sales|business development/i.test(roleTitle + " " + allText)) industryDomain = "Marketing & Sales";

    return {
        roleTitle,
        requiredDegrees,
        mandatoryDegree,
        requiredSkills: Array.from(new Set(requiredSkills)),
        preferredSkills: Array.from(new Set(preferredSkills)),
        minYearsExperience,
        mandatoryExperience,
        certifications,
        mandatoryCertifications,
        responsibilities: [],
        industryDomain,
        isLimitedJd: isLimited,
    };
}

/**
 * Extracts candidate years of experience from resume text.
 */
export function extractCandidateExperienceYears(resumeText: string): number {
    const matches = Array.from(resumeText.matchAll(/\b(\d+)\s*(?:\+|plus)?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|work\s+history)\b/gi));
    let maxYrs = 0;
    for (const m of matches) {
        const val = parseInt(m[1], 10);
        if (val > maxYrs && val < 50) maxYrs = val;
    }
    // Also look for date ranges like 2021 - 2024 (3 years)
    const dateRanges = Array.from(resumeText.matchAll(/\b(20[012]\d)\s*[-–to]+\s*(20[012]\d|present|current)\b/gi));
    let totalRangeYrs = 0;
    const currentYr = new Date().getFullYear();
    for (const dr of dateRanges) {
        const start = parseInt(dr[1], 10);
        const end = dr[2].toLowerCase().includes("present") || dr[2].toLowerCase().includes("current") ? currentYr : parseInt(dr[2], 10);
        if (end >= start && end - start < 40) {
            totalRangeYrs += (end - start);
        }
    }
    return Math.max(maxYrs, totalRangeYrs);
}

/**
 * Core deterministic ATS scoring engine.
 * Computes evidence-based scores with zero hallucination.
 */
export function computeDeterministicAts(
    resumeText: string,
    jobDescription: string,
    company: string = "",
    role: string = ""
): DeterministicAtsResult {
    const profile = extractResumeProfileHeuristic(resumeText);
    const jdReqs = parseJobDescription(jobDescription, role);
    const candidateYrs = extractCandidateExperienceYears(resumeText);

    const rLower = resumeText.toLowerCase();

    // 1. Education Match (Baseline weight: 15%, up to 25% if mandatory)
    let educationScore = 70; // Baseline neutral if JD doesn't specify degree
    let eduReason = "Degree evaluated against role requirements";
    const candidateDegree = profile.education.degree || profile.education.normalizedDegree || "";
    const candidateField = profile.education.normalizedField || profile.education.field || "";

    if (jdReqs.requiredDegrees.length > 0) {
        let hasDirectDegreeMatch = false;
        let hasRelatedDegreeMatch = false;

        for (const reqDeg of jdReqs.requiredDegrees) {
            const reqLower = reqDeg.toLowerCase();
            if (candidateDegree && (reqLower.includes(candidateDegree.toLowerCase()) || candidateDegree.toLowerCase().includes(reqLower))) {
                hasDirectDegreeMatch = true;
                break;
            }
            // Domain check
            if (reqLower.includes("commerce") && (candidateField.includes("Commerce") || candidateDegree.includes("Commerce") || candidateDegree.includes("B.Com"))) {
                hasDirectDegreeMatch = true;
                break;
            }
            if (reqLower.includes("computer science") && (candidateField.includes("Computer Science") || candidateDegree.includes("Computer Applications") || candidateDegree.includes("CSE"))) {
                hasDirectDegreeMatch = true;
                break;
            }
            if (reqLower.includes("mechanical") && candidateField.includes("Mechanical")) {
                hasDirectDegreeMatch = true;
                break;
            }
            if (reqLower.includes("civil") && candidateField.includes("Civil")) {
                hasDirectDegreeMatch = true;
                break;
            }
            if (reqLower.includes("pharmacy") && (candidateField.includes("Pharmacy") || candidateDegree.includes("Pharm"))) {
                hasDirectDegreeMatch = true;
                break;
            }
            if (reqLower.includes("business") && (candidateField.includes("Business") || candidateDegree.includes("BBA") || candidateDegree.includes("MBA"))) {
                hasDirectDegreeMatch = true;
                break;
            }
            if (reqLower.match(/\b(electronics|electrical|ece|vlsi|embedded|hardware)\b/i) && 
                (candidateField.match(/\b(electronics|electrical|ece|vlsi|embedded|hardware)\b/i) || candidateDegree.match(/\b(electronics|electrical|ece|vlsi|embedded|hardware)\b/i))) {
                hasDirectDegreeMatch = true;
                break;
            }
            if (reqLower.includes("bachelor") && profile.education.level === "undergraduate") {
                hasRelatedDegreeMatch = true;
            }
        }

        if (hasDirectDegreeMatch) {
            educationScore = 95;
            eduReason = `✓ Candidate degree (${candidateDegree}) satisfies required education`;
        } else if (hasRelatedDegreeMatch) {
            educationScore = 75;
            eduReason = `✓ Candidate holds a recognized Bachelor's degree`;
        } else {
            // Unrelated degree for a job with specific degree requirement
            educationScore = jdReqs.mandatoryDegree ? 10 : 25;
            eduReason = `△ Required ${jdReqs.requiredDegrees[0]}, candidate has ${candidateDegree || "different background"}`;
        }
    } else {
        // Evaluate by industry domain
        if (jdReqs.industryDomain.includes("Commerce") && profile.primaryDomains.includes("Commerce")) {
            educationScore = 90;
            eduReason = `✓ Education in Commerce/Accounting aligns with target role`;
        } else if (jdReqs.industryDomain.includes("Software") && profile.primaryDomains.includes("Software")) {
            educationScore = 90;
            eduReason = `✓ Education in Computer Science/Engineering aligns with target role`;
        } else if (jdReqs.industryDomain.includes("Electronics") && (profile.primaryDomains.includes("Electronics") || profile.primaryDomains.includes("Electrical") || profile.primaryDomains.includes("Hardware") || profile.primaryDomains.includes("Embedded Systems") || profile.primaryDomains.includes("Engineering"))) {
            educationScore = 90;
            eduReason = `✓ Electronics / Hardware Engineering education matches role`;
        } else if (jdReqs.industryDomain.includes("Mechanical") && profile.primaryDomains.includes("Mechanical")) {
            educationScore = 90;
            eduReason = `✓ Mechanical Engineering education matches role`;
        } else if (jdReqs.industryDomain.includes("Civil") && profile.primaryDomains.includes("Civil")) {
            educationScore = 90;
            eduReason = `✓ Civil Engineering education matches role`;
        } else if (profile.secondaryDomains.some(d => jdReqs.industryDomain.includes(d))) {
            educationScore = 65;
            eduReason = `✓ Secondary domain specialization aligns with position`;
        } else {
            educationScore = 30;
            eduReason = `△ Candidate education domain differs from position domain`;
        }
    }

    // 2. Skills Match (Baseline: 35% required, 5% preferred)
    const keywordHits: string[] = [];
    const keywordGaps: string[] = [];

    let requiredHits = 0;
    for (const skill of jdReqs.requiredSkills) {
        if (matchesSkillToken(rLower, skill)) {
            keywordHits.push(skill);
            requiredHits++;
        } else {
            keywordGaps.push(skill);
        }
    }

    let preferredHits = 0;
    for (const skill of jdReqs.preferredSkills) {
        if (matchesSkillToken(rLower, skill)) {
            keywordHits.push(`${skill} (Preferred)`);
            preferredHits++;
        } else {
            // Missing preferred skill is not a heavy gap, but noted
            keywordGaps.push(`${skill} (Preferred)`);
        }
    }

    let skillsScore = 40; // Default when JD has few explicit technical keywords
    const totalRequired = jdReqs.requiredSkills.length;
    const totalPreferred = jdReqs.preferredSkills.length;

    if (totalRequired > 0 || totalPreferred > 0) {
        const requiredRatio = totalRequired > 0 ? (requiredHits / totalRequired) : 1;
        const preferredRatio = totalPreferred > 0 ? (preferredHits / totalPreferred) : 1;
        // Required skills count for 80% of skills score, preferred for 20%
        skillsScore = Math.round(requiredRatio * 85 + preferredRatio * 15);
    } else {
        // Fallback: check profile skills against JD
        const profHits = profile.skills.filter(s => matchesSkillToken(jobDescription, s));
        if (profHits.length >= 4) skillsScore = 90;
        else if (profHits.length >= 2) skillsScore = 75;
        else if (profHits.length === 1) skillsScore = 55;
        else skillsScore = 30;
        keywordHits.push(...profHits);
    }

    // 3. Experience Match (Baseline: 25%)
    let experienceScore = 70;
    if (jdReqs.minYearsExperience > 0) {
        if (candidateYrs >= jdReqs.minYearsExperience) {
            experienceScore = 95;
        } else if (candidateYrs > 0) {
            const ratio = candidateYrs / jdReqs.minYearsExperience;
            experienceScore = Math.max(20, Math.round(ratio * 80));
        } else {
            // 0 years for a role requiring experience
            experienceScore = jdReqs.mandatoryExperience ? 15 : 30;
        }
    } else {
        // Entry level or unspecified experience
        if (profile.seniority === "junior" || candidateYrs <= 2) {
            experienceScore = 85;
        } else {
            experienceScore = 90;
        }
    }

    // 4. Tools & Deliverables Match (Baseline: 15%)
    const toolsScore = Math.min(100, Math.round(skillsScore * 0.9 + (keywordHits.length > 3 ? 10 : 0)));

    // 5. Certifications Match (Baseline: 5%)
    let certScore = 85;
    if (jdReqs.certifications.length > 0) {
        const hasCert = jdReqs.certifications.some(c => matchesSkillToken(rLower, c));
        if (hasCert) {
            certScore = 100;
        } else {
            certScore = jdReqs.mandatoryCertifications ? 15 : 45;
        }
    }

    // 6. Dynamic Weights Adaptation
    let wSkills = 0.35;
    let wExperience = 0.25;
    let wResponsibilities = 0.15;
    let wEducation = 0.15;
    let wCertifications = 0.05;
    let wPreferred = 0.05;

    if (jdReqs.mandatoryDegree) {
        wEducation += 0.10;
        wResponsibilities -= 0.05;
        wPreferred -= 0.05;
    }
    if (jdReqs.mandatoryExperience) {
        wExperience += 0.10;
        wResponsibilities -= 0.05;
        wSkills -= 0.05;
    }
    if (jdReqs.mandatoryCertifications) {
        wCertifications += 0.10;
        wResponsibilities -= 0.05;
        wPreferred -= 0.05;
    }

    const rawTotal = (
        skillsScore * wSkills +
        experienceScore * wExperience +
        toolsScore * wResponsibilities +
        educationScore * wEducation +
        certScore * wCertifications +
        (totalPreferred > 0 ? (preferredHits / totalPreferred) * 100 : skillsScore) * wPreferred
    );

    const matchPercent = Math.max(5, Math.min(98, Math.round(rawTotal)));
    const readyForMock = matchPercent >= 75;

    // Structured explanation based on verified evidence
    const cleanHits = Array.from(new Set(keywordHits)).slice(0, 15);
    const cleanGaps = Array.from(new Set(keywordGaps)).slice(0, 15);

    const summaryVerdict = matchPercent >= 75
        ? `Strong factual match (${matchPercent}%). Your background in ${profile.primaryDomains.slice(0, 2).join(" / ") || "the core domain"} satisfies the essential requirements for ${role || "this position"}.`
        : matchPercent >= 50
        ? `Moderate match (${matchPercent}%). Found partial overlap in ${cleanHits.slice(0, 3).join(", ") || "core competencies"}, but key requirements (${cleanGaps.slice(0, 2).join(", ") || "domain requirements"}) are absent.`
        : `Low compatibility (${matchPercent}%). The job requirements (${jdReqs.industryDomain}) diverge substantially from your documented credentials (${profile.education.degree || profile.primaryDomains[0] || "current background"}).`;

    const sectionAdvice = [
        cleanGaps.length > 0
            ? `Address missing job requirements (${cleanGaps.slice(0, 3).join(", ")}) in your skills and project summaries if you possess relevant exposure.`
            : `Highlight quantifiable deliverables and production metrics relevant to ${company || "the hiring team"}.`,
        eduReason,
        jdReqs.minYearsExperience > 0 && candidateYrs < jdReqs.minYearsExperience
            ? `Position requests ${jdReqs.minYearsExperience}+ years of experience; emphasize high-impact projects to demonstrate equivalent competency.`
            : `Ensure domain tools and relevant workflows asked in the job description are prominent in your resume.`
    ];

    const rewrittenBullets = [
        cleanHits.length > 0
            ? `Demonstrated expertise in ${cleanHits.slice(0, 2).join(" and ")}, successfully executing deliverables aligned with industry standards.`
            : `Delivered high-quality operational outcomes by applying systematic problem-solving and structured execution.`,
        `Streamlined core workflows and collaborated across functions to achieve measurable performance benchmarks.`
    ];

    return {
        matchPercent,
        readyForMock,
        summaryVerdict,
        breakdown: {
            skillsMatch: skillsScore,
            experienceMatch: experienceScore,
            toolsMatch: toolsScore,
            educationMatch: educationScore
        },
        keywordHits: cleanHits,
        keywordGaps: cleanGaps,
        sectionAdvice,
        rewrittenBullets,
        weightsUsed: {
            skills: wSkills,
            experience: wExperience,
            responsibilities: wResponsibilities,
            education: wEducation,
            certifications: wCertifications,
            preferred: wPreferred
        },
        isFallback: true
    };
}

/**
 * Validates AI-generated ATS claims against deterministic facts.
 * Prevents AI from hallucinating matched skills or false qualifications.
 */
export function validateAiAtsClaims(
    aiOutput: Record<string, unknown> | null | undefined,
    deterministic: DeterministicAtsResult,
    resumeText: string,
    jobDescription: string
): DeterministicAtsResult {
    const rLower = resumeText.toLowerCase();
    const jLower = jobDescription.toLowerCase();

    // 1. Validate keywordHits: MUST appear in BOTH resume and job description
    const rawAiHits = Array.isArray(aiOutput?.keywordHits) ? aiOutput.keywordHits.map(String) : [];
    const validatedHits: string[] = [];
    const rejectedHits: string[] = [];

    for (const raw of rawAiHits) {
        const clean = raw.trim();
        if (!clean) continue;
        // Verify candidate actually has this term in resume and JD has it
        const inResume = matchesSkillToken(rLower, clean);
        const inJd = matchesSkillToken(jLower, clean);

        if (inResume && inJd) {
            validatedHits.push(clean);
        } else {
            rejectedHits.push(clean);
        }
    }

    // Include deterministic verified hits that AI might have missed
    for (const dHit of deterministic.keywordHits) {
        const base = dHit.replace(/\s*\(preferred\)$/i, "");
        if (!validatedHits.some(v => v.toLowerCase() === base.toLowerCase())) {
            validatedHits.push(base);
        }
    }

    // 2. Validate keywordGaps: must appear in JD and be MISSING from resume
    const rawAiGaps = Array.isArray(aiOutput?.keywordGaps) ? aiOutput.keywordGaps.map(String) : [];
    const validatedGaps: string[] = [];

    // Add any rejected hits from AI into gaps if they actually exist in the JD
    for (const rej of rejectedHits) {
        if (matchesSkillToken(jLower, rej) && !validatedGaps.includes(rej)) {
            validatedGaps.push(rej);
        }
    }

    for (const raw of rawAiGaps) {
        const clean = raw.trim();
        if (!clean) continue;
        const inResume = matchesSkillToken(rLower, clean);
        if (!inResume && !validatedGaps.includes(clean)) {
            validatedGaps.push(clean);
        }
    }

    for (const dGap of deterministic.keywordGaps) {
        const base = dGap.replace(/\s*\(preferred\)$/i, "");
        if (!validatedGaps.some(g => g.toLowerCase() === base.toLowerCase()) && !validatedHits.some(h => h.toLowerCase() === base.toLowerCase())) {
            validatedGaps.push(base);
        }
    }

    // 3. Score validation:
    // If AI gave an inflated score that is > 18 points away from deterministic,
    // or if deterministic proved a massive qualification mismatch (e.g. B.Com applying for B.Tech CSE),
    // prevent AI score override.
    let finalScore = deterministic.matchPercent;
    if (typeof aiOutput?.matchPercent === "number") {
        const aiScore = Math.min(100, Math.max(0, Math.round(aiOutput.matchPercent)));
        const diff = Math.abs(aiScore - deterministic.matchPercent);

        if (deterministic.breakdown.educationMatch < 35 && aiScore > 65) {
            // Massive education/domain contradiction (e.g. Commerce vs Software Engineering)
            finalScore = deterministic.matchPercent;
        } else if (diff <= 15) {
            // AI is in reasonable agreement, blend gracefully with deterministic evidence
            finalScore = Math.round(aiScore * 0.4 + deterministic.matchPercent * 0.6);
        } else {
            // Enforce deterministic evidence over unsupported AI claim
            finalScore = deterministic.matchPercent;
        }
    }

    const readyForMock = finalScore >= 75;

    // Breakdown validation
    const aiBreakdown = aiOutput && typeof aiOutput.breakdown === "object" && aiOutput.breakdown !== null
        ? (aiOutput.breakdown as Record<string, unknown>)
        : undefined;

    const breakdown = {
        skillsMatch: typeof aiBreakdown?.skillsMatch === "number" && Math.abs(aiBreakdown.skillsMatch - deterministic.breakdown.skillsMatch) <= 25
            ? Math.round(aiBreakdown.skillsMatch * 0.3 + deterministic.breakdown.skillsMatch * 0.7)
            : deterministic.breakdown.skillsMatch,
        experienceMatch: typeof aiBreakdown?.experienceMatch === "number" && Math.abs(aiBreakdown.experienceMatch - deterministic.breakdown.experienceMatch) <= 25
            ? Math.round(aiBreakdown.experienceMatch * 0.3 + deterministic.breakdown.experienceMatch * 0.7)
            : deterministic.breakdown.experienceMatch,
        toolsMatch: typeof aiBreakdown?.toolsMatch === "number"
            ? Math.round(aiBreakdown.toolsMatch * 0.3 + deterministic.breakdown.toolsMatch * 0.7)
            : deterministic.breakdown.toolsMatch,
        educationMatch: deterministic.breakdown.educationMatch, // Keep factual education match
    };

    return {
        matchPercent: finalScore,
        readyForMock,
        summaryVerdict: typeof aiOutput?.summaryVerdict === "string" && aiOutput.summaryVerdict.length > 10
            ? aiOutput.summaryVerdict
            : deterministic.summaryVerdict,
        breakdown,
        keywordHits: validatedHits.slice(0, 15),
        keywordGaps: validatedGaps.slice(0, 15),
        sectionAdvice: Array.isArray(aiOutput?.sectionAdvice) && aiOutput.sectionAdvice.length > 0
            ? aiOutput.sectionAdvice.slice(0, 4)
            : deterministic.sectionAdvice,
        rewrittenBullets: Array.isArray(aiOutput?.rewrittenBullets) && aiOutput.rewrittenBullets.length > 0
            ? aiOutput.rewrittenBullets.slice(0, 3)
            : deterministic.rewrittenBullets,
        weightsUsed: deterministic.weightsUsed,
        isFallback: false
    };
}
