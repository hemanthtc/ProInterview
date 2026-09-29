import { matchesSkillToken, normalizeSkillToken } from "./tokenMatching";

export type JobType = "full-time" | "intern" | "contract";

export interface EducationInfo {
    degree?: string;
    field?: string;
    specialization?: string;
    level?: string; // "undergraduate" | "postgraduate" | "diploma" | "doctorate" | "certification" | "secondary"
    graduationYear?: string;
    normalizedDegree?: string;
    normalizedField?: string;
}

export interface ProjectInfo {
    title: string;
    domain?: string;
    technologies?: string[];
    skills?: string[];
    description?: string;
}

export interface MatchBreakdown {
    educationMatchScore: number;
    skillsMatchScore: number;
    projectsMatchScore: number;
    experienceMatchScore: number;
    certificationMatchScore: number;
    overallMatchScore: number;
    educationExplanation: string;
    skillsExplanation: string;
    projectsExplanation: string;
    locationExplanation?: string;
    experienceExplanation?: string;
}

export interface MatchedJob {
    id: string;
    company: string;
    role: string;
    location: string;
    type: JobType;
    remote: boolean;
    tags: string[];
    salaryRange?: string;
    description: string;
    fullDescription?: string;
    applyUrl: string;
    postedAt: string;
    source: string;
    matchPercent: number;
    matchReasons: string[];
    matchBreakdown?: MatchBreakdown;
}

export interface ResumeProfile {
    education: EducationInfo;
    primaryDomains: string[];
    secondaryDomains: string[];
    roles: string[];
    skills: string[];
    technicalSkills: string[];
    professionalSkills: string[];
    projects: ProjectInfo[];
    experience: string[];
    certifications: string[];
    languages: string[];
    keywords: string[];
    seniority: string;
    summary: string;
}

// --------------------------------------------------------------------------
// SKILLS DICTIONARY (Categorized: Technical & Professional)
// --------------------------------------------------------------------------

const TECHNICAL_SKILLS = [
    // Programming & Frameworks
    "javascript", "typescript", "python", "java", "kotlin", "swift", "golang", "go",
    "rust", "c++", "c#", "ruby", "php", "scala", "react", "next.js", "nextjs", "vue",
    "angular", "nodejs", "node.js", "node", "express", "django", "flask", "spring", "spring boot",
    "fastapi", "aws", "gcp", "azure", "docker", "kubernetes", "k8s", "terraform",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "graphql", "rest api", "sql",
    "machine learning", "ml", "deep learning", "nlp", "pytorch", "tensorflow",
    "pandas", "numpy", "spark", "hadoop", "kafka", "ci/cd", "jenkins", "github actions",
    "linux", "git", "figma", "ui/ux", "microservices", "devops", "sre", "android",
    "ios", "flutter", "react native", "tailwind", "html", "css",
    // Data & BI Tools
    "power bi", "powerbi", "tableau", "excel", "advanced excel", "vba", "google sheets",
    // Engineering & CAD Tools
    "autocad", "cad", "solidworks", "catia", "ansys", "matlab", "staad", "staad pro", "staad.pro",
    "revit", "creo", "nx", "gis", "arcgis", "primavera", "etabs",
    // Business & Accounting Tools
    "tally", "tally prime", "tally erp", "sap", "quickbooks", "zoho", "zoho books",
    "salesforce", "hubspot", "jira",
    // Science & Lab Tools
    "hplc", "gc-ms", "spectrophotometry", "pcr", "gel electrophoresis", "autoclave",
    // Electronics, VLSI & Embedded Systems
    "cadence", "virtuoso", "cadence virtuoso", "spectre", "hspice", "calibre",
    "analog layout", "physical design", "fpga", "verilog", "vhdl", "systemverilog",
    "drc", "lvs", "erc", "cmos", "floorplanning", "cts", "clock tree synthesis",
    "sta", "static timing analysis", "place and route", "p&r", "synthesis",
    "embedded c", "embedded systems", "rtos", "arm", "cortex", "microcontroller",
    "arduino", "raspberry pi", "stm32", "pic", "8051", "i2c", "spi", "uart",
    "pcb design", "pcb", "altium", "eagle", "kicad", "orcad",
    "signal processing", "dsp", "rf", "antenna", "vlsi", "asic",
    "xilinx", "vivado", "quartus", "modelsim", "vivado hls",
    "power electronics", "inverter", "converter", "motor drive",
    "plc", "scada", "ladder logic", "hmi", "industrial automation",
];

const PROFESSIONAL_SKILLS = [
    // Accounting & Finance
    "accounting", "financial accounting", "management accounting", "gst", "taxation",
    "direct tax", "indirect tax", "tds", "income tax", "auditing", "statutory audit",
    "internal audit", "financial analysis", "financial modeling", "budgeting",
    "forecasting", "bank reconciliation", "accounts payable", "accounts receivable",
    "ledger", "payroll", "balance sheet", "p&l", "cost accounting", "corporate finance",
    "valuation", "banking", "credit analysis", "risk management", "investment banking",
    "portfolio management", "wealth management", "compliance",
    // Business, Management, Marketing, HR
    "business development", "lead generation", "sales", "client relationship",
    "account management", "b2b sales", "b2c sales", "digital marketing", "seo", "sem",
    "social media marketing", "content marketing", "email marketing", "branding",
    "market research", "competitor analysis", "product management", "operations management",
    "supply chain", "logistics", "procurement", "inventory management", "vendor management",
    "human resources", "recruitment", "talent acquisition", "employee engagement",
    "onboarding", "hr operations", "performance management", "training and development",
    // Mechanical & Manufacturing
    "manufacturing", "production planning", "quality control", "quality assurance",
    "lean manufacturing", "six sigma", "5s", "kaizen", "maintenance", "hvac",
    "thermodynamics", "machining", "cnc", "assembly", "tool design", "automotive",
    "hydraulics", "pneumatics", "welding", "plant operations", "process engineering",
    // Civil & Construction
    "construction", "site engineering", "site supervision", "structural design",
    "structural analysis", "surveying", "total station", "quantity estimation",
    "bill of quantities", "boq", "bar bending schedule", "concrete technology",
    "geotechnical", "highway engineering", "building codes", "project estimation",
    // Pharmacy & Life Sciences
    "pharmaceutical", "pharmacology", "drug formulation", "gmp", "cgmp", "quality control",
    "quality assurance", "clinical research", "clinical trials", "pharmacovigilance",
    "microbiology", "biotechnology", "molecular biology", "cell culture", "biochemistry",
    "lab testing", "assay development", "sample preparation", "medical terminology",
    // Architecture & Design
    "architectural design", "interior design", "space planning", "3d modeling",
    "rendering", "drafting", "building materials", "urban planning", "landscape design",
    // Writing & Communication
    "content writing", "copywriting", "creative writing", "technical writing",
    "proofreading", "editing", "storytelling", "public relations", "press release",
    "instructional design", "communication", "curriculum development",
];

function stripHtml(html: string): string {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeType(raw: string | undefined): JobType {
    const v = (raw || "").toLowerCase();
    if (v.includes("intern") || v.includes("trainee") || v.includes("apprentice")) return "intern";
    if (v.includes("contract") || v.includes("freelance") || v.includes("temporary")) return "contract";
    return "full-time";
}

function uniqueStrings(items: string[], limit = 20): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
        const cleaned = item.trim().replace(/\s+/g, " ");
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cleaned);
        if (out.length >= limit) break;
    }
    return out;
}

export function canonicalSkill(skill: string): string {
    return normalizeSkillToken(skill);
}

// --------------------------------------------------------------------------
// 1. EDUCATION-FIRST RESUME PARSING & NORMALIZATION
// --------------------------------------------------------------------------

interface DegreeRule {
    pattern: RegExp;
    normalizedDegree: string;
    level: "undergraduate" | "postgraduate" | "diploma" | "doctorate" | "certification";
    defaultField: string;
    defaultDomains: string[];
    defaultRoles: string[];
}

const DEGREE_RULES: DegreeRule[] = [
    // Commerce / Finance Degrees
    {
        pattern: /\b(b\.?\s*com(\.?(hons|honours|general))?|bachelor\s+of\s+commerce)\b/i,
        normalizedDegree: "Bachelor of Commerce",
        level: "undergraduate",
        defaultField: "Commerce & Accounting",
        defaultDomains: ["Commerce", "Accounting", "Finance", "Banking"],
        defaultRoles: ["Accountant", "Accounts Executive", "Finance Executive", "Audit Assistant", "Junior Accountant", "Tax Associate"],
    },
    {
        pattern: /\b(m\.?\s*com|master\s+of\s+commerce)\b/i,
        normalizedDegree: "Master of Commerce",
        level: "postgraduate",
        defaultField: "Commerce & Finance",
        defaultDomains: ["Commerce", "Accounting", "Finance", "Banking"],
        defaultRoles: ["Senior Accountant", "Financial Analyst", "Finance Executive", "Accounts Manager", "Tax Consultant"],
    },
    {
        pattern: /\b(ca|chartered\s+accountant|acca|cpa|cma|cfa|icwa)\b/i,
        normalizedDegree: "Chartered Accountant / Finance Professional",
        level: "certification",
        defaultField: "Accounting & Auditing",
        defaultDomains: ["Finance", "Accounting", "Auditing", "Taxation"],
        defaultRoles: ["Chartered Accountant", "Audit Senior", "Financial Controller", "Tax Specialist", "Finance Analyst"],
    },
    // Business / Management Degrees
    {
        pattern: /\b(bba(\.?(hons|honours))?|b\.?\s*b\.?\s*a|bachelor\s+of\s+business\s+administration|bms|bbm)\b/i,
        normalizedDegree: "Bachelor of Business Administration",
        level: "undergraduate",
        defaultField: "Business Administration",
        defaultDomains: ["Business", "Management", "Operations", "Marketing", "HR", "Sales"],
        defaultRoles: ["Business Development Executive", "Operations Executive", "Marketing Executive", "HR Executive", "Management Trainee", "Sales Executive"],
    },
    {
        pattern: /\b(mba|m\.?\s*b\.?\s*a|master\s+of\s+business\s+administration|pgdm)\b/i,
        normalizedDegree: "Master of Business Administration",
        level: "postgraduate",
        defaultField: "Business Administration",
        defaultDomains: ["Business", "Management", "Operations", "Finance", "Marketing"],
        defaultRoles: ["Management Trainee", "Business Analyst", "Marketing Manager", "Operations Manager", "HR Specialist"],
    },
    // Computer Science / IT Degrees
    {
        pattern: /\b(bca|b\.?\s*c\.?\s*a|bachelor\s+of\s+computer\s+applications)\b/i,
        normalizedDegree: "Bachelor of Computer Applications",
        level: "undergraduate",
        defaultField: "Computer Applications",
        defaultDomains: ["Software", "Computer Science", "IT", "Web Development"],
        defaultRoles: ["Software Developer", "Web Developer", "QA Analyst", "System Associate", "Junior Developer"],
    },
    {
        pattern: /\b(mca|m\.?\s*c\.?\s*a|master\s+of\s+computer\s+applications)\b/i,
        normalizedDegree: "Master of Computer Applications",
        level: "postgraduate",
        defaultField: "Computer Applications",
        defaultDomains: ["Software", "Computer Science", "IT", "Data"],
        defaultRoles: ["Software Engineer", "Backend Developer", "Full Stack Developer", "Application Developer"],
    },
    {
        pattern: /\b(b\.?\s*tech|b\.?\s*e\.?(\b|\s)|bachelor\s+of\s+technology|bachelor\s+of\s+engineering)\b/i,
        normalizedDegree: "Bachelor of Technology",
        level: "undergraduate",
        defaultField: "Engineering",
        defaultDomains: ["Engineering", "Technology"],
        defaultRoles: ["Graduate Engineer Trainee", "Associate Engineer", "Technical Specialist"],
    },
    {
        pattern: /\b(m\.?\s*tech|m\.?\s*e\.?(\b|\s)|master\s+of\s+technology|master\s+of\s+engineering)\b/i,
        normalizedDegree: "Master of Technology",
        level: "postgraduate",
        defaultField: "Engineering",
        defaultDomains: ["Engineering", "Technology", "Research"],
        defaultRoles: ["Lead Engineer", "Senior Engineer", "R&D Specialist"],
    },
    // Science Degrees
    {
        pattern: /\b(b\.?\s*sc|bachelor\s+of\s+science|\bbs\b)\b/i,
        normalizedDegree: "Bachelor of Science",
        level: "undergraduate",
        defaultField: "Science",
        defaultDomains: ["Science", "Research", "Analysis"],
        defaultRoles: ["Research Assistant", "Laboratory Associate", "Quality Analyst"],
    },
    {
        pattern: /\b(m\.?\s*sc|master\s+of\s+science|\bms\b)\b/i,
        normalizedDegree: "Master of Science",
        level: "postgraduate",
        defaultField: "Science",
        defaultDomains: ["Science", "Research", "Analysis"],
        defaultRoles: ["Research Scientist", "Scientific Associate", "Senior Analyst"],
    },
    // Pharmacy
    {
        pattern: /\b(b\.?\s*pharm|bachelor\s+of\s+pharmacy|pharm\.?\s*d)\b/i,
        normalizedDegree: "Bachelor of Pharmacy",
        level: "undergraduate",
        defaultField: "Pharmacy",
        defaultDomains: ["Pharmacy", "Pharmaceutical", "Healthcare", "Clinical Research"],
        defaultRoles: ["Pharmacist", "Medical Representative", "Clinical Research Associate", "Quality Assurance Chemist"],
    },
    {
        pattern: /\b(m\.?\s*pharm|master\s+of\s+pharmacy)\b/i,
        normalizedDegree: "Master of Pharmacy",
        level: "postgraduate",
        defaultField: "Pharmacy",
        defaultDomains: ["Pharmacy", "Pharmaceutical", "Formulation", "Clinical Research"],
        defaultRoles: ["Formulation Scientist", "Drug Safety Specialist", "Clinical Research Associate", "Regulatory Affairs Specialist"],
    },
    // Architecture
    {
        pattern: /\b(b\.?\s*arch|bachelor\s+of\s+architecture)\b/i,
        normalizedDegree: "Bachelor of Architecture",
        level: "undergraduate",
        defaultField: "Architecture",
        defaultDomains: ["Architecture", "Architectural Design", "Interior Design", "Construction"],
        defaultRoles: ["Architect", "Architectural Designer", "Interior Designer", "Draftsman", "Project Architect"],
    },
    // Arts & Humanities
    {
        pattern: /\b(b\.?\s*a(\.?(hons|honours))?|bachelor\s+of\s+arts)\b/i,
        normalizedDegree: "Bachelor of Arts",
        level: "undergraduate",
        defaultField: "Humanities & Arts",
        defaultDomains: ["Content", "Communication", "Media", "Education"],
        defaultRoles: ["Content Writer", "Copywriter", "Communications Specialist", "Editorial Assistant", "Public Relations Associate"],
    },
    {
        pattern: /\b(m\.?\s*a|master\s+of\s+arts)\b/i,
        normalizedDegree: "Master of Arts",
        level: "postgraduate",
        defaultField: "Humanities & Arts",
        defaultDomains: ["Content", "Communication", "Media", "Education"],
        defaultRoles: ["Senior Content Strategist", "Communications Manager", "Editor", "Instructional Designer"],
    },
    // Diploma
    {
        pattern: /\b(diploma|polytechnic)\b/i,
        normalizedDegree: "Diploma",
        level: "diploma",
        defaultField: "Technical Diploma",
        defaultDomains: ["Engineering", "Technical Operations"],
        defaultRoles: ["Diploma Trainee", "Junior Engineer", "Site Supervisor", "Technical Assistant"],
    },
];

interface FieldRule {
    pattern: RegExp;
    normalizedField: string;
    domains: string[];
    roles: string[];
}

const FIELD_RULES: FieldRule[] = [
    // Computer Science & IT
    {
        pattern: /\b(computer\s+science|cse|cs\b|software\s+engineering|information\s+technology|it\b|data\s+science|artificial\s+intelligence|ai\s*(&|\+|and)\s*ds|ai\s*(&|\+|and)\s*ml)\b/i,
        normalizedField: "Computer Science",
        domains: ["Software", "Computer Science", "IT", "Data", "Cloud"],
        roles: ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Software Developer", "QA Engineer", "DevOps Engineer"],
    },
    // Mechanical Engineering
    {
        pattern: /\b(mechanical\s+engineering|mechanical|automobile|automotive|production\s+engineering|manufacturing|industrial\s+engineering|cad\s+design|mechatronics)\b/i,
        normalizedField: "Mechanical Engineering",
        domains: ["Mechanical", "Manufacturing", "Production", "CAD"],
        roles: ["Mechanical Engineer", "Design Engineer", "CAD Engineer", "Production Engineer", "Quality Control Engineer", "Manufacturing Engineer"],
    },
    // Civil Engineering
    {
        pattern: /\b(civil\s+engineering|civil|structural\s+engineering|construction\s+engineering|infrastructure|environmental\s+engineering|geotechnical)\b/i,
        normalizedField: "Civil Engineering",
        domains: ["Civil", "Construction", "Infrastructure"],
        roles: ["Civil Engineer", "Site Engineer", "Structural Engineer", "Construction Supervisor", "Estimation Engineer", "Quality Surveyor"],
    },
    // Electrical & Electronics
    {
        pattern: /\b(electrical\s+engineering|electronics|ece\b|eee\b|electrical\s*(&|\+|and)\s*electronics|electronics\s*(&|\+|and)\s*communication|telecommunication|instrumentation|embedded\s+systems|vlsi)\b/i,
        normalizedField: "Electrical & Electronics Engineering",
        domains: ["Electrical", "Electronics", "Embedded Systems", "Hardware"],
        roles: ["Electrical Engineer", "Electronics Engineer", "Embedded Systems Engineer", "Hardware Design Engineer", "Testing Engineer"],
    },
    // Finance & Accounting
    {
        pattern: /\b(finance|financial\s+analysis|financial\s+modeling|valuation|banking|credit\s+analysis|investment\s+banking)\b/i,
        normalizedField: "Finance",
        domains: ["Finance", "Banking", "Business", "Financial Analysis"],
        roles: ["Financial Analyst", "Finance Executive", "Accounts Executive", "Audit Assistant", "Junior Accountant", "Investment Analyst"],
    },
    // Commerce & Accounting
    {
        pattern: /\b(commerce|accounting|accountancy|taxation|direct\s+tax|audit|auditing)\b/i,
        normalizedField: "Commerce & Accounting",
        domains: ["Commerce", "Accounting", "Finance", "Banking"],
        roles: ["Accountant", "Accounts Executive", "Finance Executive", "Audit Assistant", "Junior Accountant", "Tax Associate"],
    },
    // Marketing & Sales
    {
        pattern: /\b(marketing|digital\s+marketing|brand\s+management|sales|advertising|market\s+research)\b/i,
        normalizedField: "Marketing",
        domains: ["Marketing", "Sales", "Business", "Media"],
        roles: ["Marketing Executive", "Digital Marketing Specialist", "Sales Executive", "Brand Associate", "Market Research Analyst"],
    },
    // Human Resources
    {
        pattern: /\b(human\s+resources|hr\b|personnel\s+management|talent\s+acquisition)\b/i,
        normalizedField: "Human Resources",
        domains: ["Human Resources", "Management", "Operations"],
        roles: ["HR Executive", "Talent Acquisition Specialist", "HR Generalist", "Recruiter", "People Operations Associate"],
    },
    // Operations & Supply Chain
    {
        pattern: /\b(operations|supply\s+chain|logistics|procurement|inventory\s+management)\b/i,
        normalizedField: "Operations",
        domains: ["Operations", "Supply Chain", "Logistics", "Management"],
        roles: ["Operations Executive", "Supply Chain Analyst", "Logistics Coordinator", "Inventory Executive", "Operations Trainee"],
    },
    // Biology & Life Sciences
    {
        pattern: /\b(biology|biotechnology|biotech|microbiology|molecular\s+biology|biochemistry|life\s+sciences|zoology|botany)\b/i,
        normalizedField: "Biology & Life Sciences",
        domains: ["Biology", "Laboratory", "Life Sciences", "Biotechnology"],
        roles: ["Research Assistant", "Laboratory Technician", "Biotechnologist", "Microbiologist", "Quality Analyst"],
    },
    // Pharmacy
    {
        pattern: /\b(pharmacy|pharmaceutical|pharmacology|pharmaceutics)\b/i,
        normalizedField: "Pharmacy",
        domains: ["Pharmacy", "Pharmaceutical", "Clinical Research"],
        roles: ["Pharmacist", "Medical Representative", "Clinical Research Associate", "Quality Assurance Chemist"],
    },
    // Architecture
    {
        pattern: /\b(architecture|architectural\s+design|interior\s+design|urban\s+planning)\b/i,
        normalizedField: "Architecture",
        domains: ["Architecture", "Architectural Design", "Interior Design"],
        roles: ["Architect", "Architectural Designer", "Interior Designer", "Draftsman"],
    },
    // English & Communication
    {
        pattern: /\b(english|english\s+literature|journalism|mass\s+communication|media|communications?|creative\s+writing)\b/i,
        normalizedField: "English & Communication",
        domains: ["English", "Communication", "Content", "Education"],
        roles: ["Content Writer", "Copywriter", "Communications Specialist", "Editorial Assistant", "Public Relations Associate"],
    },
];

/** Extract structured education details from resume text. */
export function extractEducationInfo(resumeText: string): EducationInfo {
    const lower = resumeText.toLowerCase();

    // 1. Identify education section or education context window
    let educationSnippet = "";
    const eduMatch = resumeText.match(/education[\s\S]{1,250}?(?=\n\s*(?:skills|experience|projects|certifications|work history)|$)/i);
    if (eduMatch) {
        educationSnippet = eduMatch[0];
    } else {
        educationSnippet = resumeText.slice(0, 500);
    }

    // 2. Find matching degree rule
    let matchedDegreeRule: DegreeRule | null = null;
    let rawDegree = "";
    for (const rule of DEGREE_RULES) {
        const match = (educationSnippet || resumeText).match(rule.pattern);
        if (match) {
            matchedDegreeRule = rule;
            rawDegree = match[0].trim();
            break;
        }
    }

    // 3. Find matching field / specialization rule specifically within the education context
    let matchedFieldRule: FieldRule | null = null;
    let rawField = "";

    for (const rule of FIELD_RULES) {
        if (rule.pattern.test(educationSnippet)) {
            matchedFieldRule = rule;
            const m = educationSnippet.match(rule.pattern);
            rawField = m ? m[0].trim() : rule.normalizedField;
            break;
        }
    }

    // 4. Fallback if no degree found
    if (!matchedDegreeRule && matchedFieldRule) {
        rawDegree = matchedFieldRule.normalizedField;
    } else if (!matchedDegreeRule && !matchedFieldRule) {
        const eduSection = resumeText.match(/education[:\s-]+([^\n\r,]+)/i);
        if (eduSection && eduSection[1]) {
            const raw = eduSection[1].trim();
            if (raw.length > 2 && raw.length < 60) {
                rawDegree = raw;
            }
        }
    }

    // 5. Graduation year
    let graduationYear: string | undefined;
    const yearMatch = (educationSnippet || resumeText).match(/\b(20[123][0-9]|19[89][0-9])\b/);
    if (yearMatch) {
        graduationYear = yearMatch[1];
    }

    const degreeName = rawDegree || (matchedDegreeRule ? matchedDegreeRule.normalizedDegree : undefined);
    const fieldName = rawField || (matchedFieldRule ? matchedFieldRule.normalizedField : matchedDegreeRule?.defaultField);
    const level = matchedDegreeRule?.level || (lower.includes("master") || lower.includes("post graduate") ? "postgraduate" : "undergraduate");

    let normalizedDegree = matchedDegreeRule ? matchedDegreeRule.normalizedDegree : degreeName;
    const normalizedField = matchedFieldRule ? matchedFieldRule.normalizedField : (matchedDegreeRule ? matchedDegreeRule.defaultField : fieldName);

    if (matchedDegreeRule?.normalizedDegree === "Bachelor of Technology" || matchedDegreeRule?.normalizedDegree === "Bachelor of Engineering") {
        if (normalizedField && normalizedField !== "Engineering") {
            normalizedDegree = `${matchedDegreeRule.normalizedDegree} - ${normalizedField}`;
        }
    } else if (matchedDegreeRule?.normalizedDegree === "Master of Business Administration") {
        if (normalizedField && /finance/i.test(normalizedField)) {
            normalizedDegree = "Master of Business Administration - Finance";
        }
    } else if (matchedDegreeRule?.normalizedDegree === "Bachelor of Commerce") {
        if (/\bfinance\b/i.test(educationSnippet)) {
            normalizedDegree = "Bachelor of Commerce - Finance";
        } else {
            normalizedDegree = "Bachelor of Commerce";
        }
    } else if (matchedDegreeRule?.normalizedDegree === "Bachelor of Science" && normalizedField) {
        normalizedDegree = `${matchedDegreeRule.normalizedDegree} - ${normalizedField}`;
    } else if (matchedDegreeRule?.normalizedDegree === "Bachelor of Arts" && normalizedField) {
        normalizedDegree = `${matchedDegreeRule.normalizedDegree} - ${normalizedField}`;
    }

    return {
        degree: degreeName,
        field: fieldName,
        specialization: fieldName,
        level,
        graduationYear,
        normalizedDegree,
        normalizedField,
    };
}

// --------------------------------------------------------------------------
// 2. DYNAMIC CAREER DOMAIN & JOB FAMILIES DERIVATION
// --------------------------------------------------------------------------

interface CareerDomainResult {
    primaryDomains: string[];
    secondaryDomains: string[];
    roles: string[];
}

export function deriveCareerDomainsAndRoles(
    education: EducationInfo,
    skills: string[],
    projects: ProjectInfo[]
): CareerDomainResult {
    const primaryDomains: string[] = [];
    const secondaryDomains: string[] = [];
    const roles: string[] = [];

    const normDegree = (education.normalizedDegree || "").toLowerCase();
    const normField = (education.normalizedField || "").toLowerCase();
    const allEduText = `${education.degree || ""} ${education.field || ""} ${normDegree} ${normField}`.toLowerCase();

    let matchedFieldRule: FieldRule | null = null;
    for (const rule of FIELD_RULES) {
        if (rule.pattern.test(normField) || rule.pattern.test(allEduText)) {
            matchedFieldRule = rule;
            break;
        }
    }

    let matchedDegreeRule: DegreeRule | null = null;
    for (const rule of DEGREE_RULES) {
        if (rule.pattern.test(allEduText) || rule.normalizedDegree.toLowerCase() === normDegree) {
            matchedDegreeRule = rule;
            break;
        }
    }

    // Special handling for B.Com to ensure Commerce & Accounting are primary
    if (normDegree.includes("commerce") || allEduText.includes("b.com")) {
        primaryDomains.push("Commerce", "Accounting", "Finance", "Banking");
        roles.push("Accountant", "Accounts Executive", "Finance Executive", "Audit Assistant", "Junior Accountant", "Tax Associate");
    } else if (matchedFieldRule) {
        primaryDomains.push(...matchedFieldRule.domains);
        roles.push(...matchedFieldRule.roles);
    } else if (matchedDegreeRule) {
        primaryDomains.push(...matchedDegreeRule.defaultDomains);
        roles.push(...matchedDegreeRule.defaultRoles);
    } else if (education.normalizedField) {
        const field = education.normalizedField;
        primaryDomains.push(field, `${field} Domain`, "Operations");
        roles.push(`${field} Specialist`, `${field} Associate`, `${field} Executive`, `${field} Analyst`);
    } else {
        // Safe token-aware fallback from skills/projects without forcing Software
        const lowerSkills = skills.map((s) => s.toLowerCase());
        if (lowerSkills.some((s) => /accounting|excel|tally|gst|tax|finance|audit/i.test(s))) {
            primaryDomains.push("Commerce", "Accounting", "Finance");
            roles.push("Accountant", "Accounts Executive", "Finance Executive");
        } else if (lowerSkills.some((s) => /autocad|cad|mechanical|solidworks|manufacturing/i.test(s))) {
            primaryDomains.push("Mechanical", "Manufacturing", "CAD");
            roles.push("Mechanical Engineer", "Design Engineer", "CAD Engineer");
        } else if (lowerSkills.some((s) => /civil|staad|construction|surveying/i.test(s))) {
            primaryDomains.push("Civil", "Construction", "Infrastructure");
            roles.push("Civil Engineer", "Site Engineer", "Structural Engineer");
        } else if (lowerSkills.some((s) => /pharmacy|pharmacology|clinical|biology|chemist/i.test(s))) {
            primaryDomains.push("Pharmacy", "Life Sciences", "Healthcare");
            roles.push("Pharmacist", "Clinical Research Associate", "Quality Chemist");
        } else if (lowerSkills.some((s) => /marketing|sales|business development|operations|hr/i.test(s))) {
            primaryDomains.push("Marketing", "Business", "Management", "Operations");
            roles.push("Marketing Executive", "Business Development Executive", "Operations Executive");
        } else if (lowerSkills.some((s) => /javascript|python|java|react|node|c\+\+|sql|devops/i.test(s))) {
            primaryDomains.push("Software", "Computer Science", "IT");
            roles.push("Software Engineer", "Software Developer", "Full Stack Developer");
        } else {
            primaryDomains.push("General Professional", "Operations");
            roles.push("Associate", "Executive", "Operations Associate");
        }
    }

    // Skills-based secondary refinement
    const isTechOrCS = primaryDomains.some((d) => /software|computer science|it\b/i.test(d));
    const lowerSkills = skills.map((s) => s.toLowerCase());
    const hasDataSkills = lowerSkills.some((s) => /python|sql|power bi|tableau|data analysis/i.test(s));
    const hasAnalyticsProject = projects.some((p) => /data|analytics|dashboard|forecasting|analysis/i.test((p.title + " " + (p.domain || "")).toLowerCase()));

    if (!isTechOrCS && (hasDataSkills || hasAnalyticsProject)) {
        secondaryDomains.push("Data Analysis", "Financial Analytics", "Business Analytics");
        if (primaryDomains.includes("Finance") || primaryDomains.includes("Commerce")) {
            roles.push("Financial Data Analyst", "Business Analyst", "Data Analyst");
        } else {
            roles.push("Business Analyst", "Data Analyst");
        }
    }

    // Non-technical degree with technical project (e.g. B.Com + React inventory application)
    const hasWebSkills = lowerSkills.some((s) => /react|node|javascript|typescript|html|css|web/i.test(s));
    const hasWebProject = projects.some((p) => /react|web|app|application|frontend/i.test((p.title + " " + (p.domain || "")).toLowerCase()));
    if (!isTechOrCS && (hasWebSkills || hasWebProject)) {
        secondaryDomains.push("Web & Software Applications");
        roles.push("Technical Operations Associate", "Junior Web Developer");
    }

    return {
        primaryDomains: uniqueStrings(primaryDomains, 6),
        secondaryDomains: uniqueStrings(secondaryDomains, 6),
        roles: uniqueStrings(roles, 8),
    };
}

// --------------------------------------------------------------------------
// 3. PROJECT EXTRACTION
// --------------------------------------------------------------------------

export function extractProjectsFromResume(resumeText: string): ProjectInfo[] {
    const projects: ProjectInfo[] = [];
    const lines = resumeText.split(/\r?\n/);
    let inProjectSection = false;
    let currentProject: Partial<ProjectInfo> | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (/^(projects|academic projects|personal projects|key projects|capstone projects)/i.test(line)) {
            inProjectSection = true;
            continue;
        }

        if (inProjectSection && /^(education|skills|experience|work history|certifications|languages|achievements|summary)/i.test(line)) {
            inProjectSection = false;
            if (currentProject?.title) {
                projects.push({
                    title: currentProject.title,
                    domain: currentProject.domain || "General",
                    technologies: currentProject.technologies || [],
                    skills: currentProject.skills || [],
                    description: currentProject.description,
                });
            }
            currentProject = null;
            break;
        }

        if (inProjectSection) {
            if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || (line.length < 50 && !line.includes(":") && !line.endsWith("."))) {
                const titleCandidate = line.replace(/^[•\-*]\s*/, "").trim();
                if (/^(technologies|tools|skills|tech stack):/i.test(titleCandidate)) {
                    if (currentProject) {
                        const techs = titleCandidate.replace(/^(technologies|tools|skills|tech stack):\s*/i, "").split(/[,/|]+/).map((s) => s.trim());
                        currentProject.technologies = uniqueStrings([...(currentProject.technologies || []), ...techs]);
                    }
                    continue;
                }

                if (titleCandidate.length > 3 && titleCandidate.length < 70) {
                    if (currentProject?.title) {
                        projects.push({
                            title: currentProject.title,
                            domain: currentProject.domain || "General",
                            technologies: currentProject.technologies || [],
                            skills: currentProject.skills || [],
                            description: currentProject.description,
                        });
                    }
                    currentProject = {
                        title: titleCandidate,
                        technologies: [],
                        skills: [],
                        description: "",
                    };
                    continue;
                }
            }

            if (currentProject) {
                currentProject.description = ((currentProject.description || "") + " " + line).trim();
            }
        }
    }

    if (currentProject?.title) {
        projects.push({
            title: currentProject.title,
            domain: currentProject.domain || "General",
            technologies: currentProject.technologies || [],
            skills: currentProject.skills || [],
            description: currentProject.description,
        });
    }

    if (projects.length === 0) {
        const inlineMatches = resumeText.matchAll(/project[s]?\s*[:\-]\s*([^\n\r.]+)/gi);
        for (const m of inlineMatches) {
            const rawTitle = m[1].trim();
            if (rawTitle.length > 3 && rawTitle.length < 80) {
                projects.push({
                    title: rawTitle,
                    domain: "General",
                    technologies: [],
                    skills: [],
                });
            }
        }
    }

    return projects.slice(0, 5);
}

// --------------------------------------------------------------------------
// 4. HEURISTIC RESUME PROFILER (Education-First & Token-Aware)
// --------------------------------------------------------------------------

export function extractResumeProfileHeuristic(resumeText: string): ResumeProfile {
    // 1. Education extraction
    const education = extractEducationInfo(resumeText);

    // 2. Project extraction
    const projects = extractProjectsFromResume(resumeText);

    // 3. Safe token-aware skills extraction
    const technicalSkills: string[] = [];
    for (const raw of TECHNICAL_SKILLS) {
        if (matchesSkillToken(resumeText, raw)) {
            const canon = normalizeSkillToken(raw);
            if (!technicalSkills.includes(canon)) {
                technicalSkills.push(canon);
            }
        }
    }

    const professionalSkills: string[] = [];
    for (const raw of PROFESSIONAL_SKILLS) {
        if (matchesSkillToken(resumeText, raw)) {
            const canon = normalizeSkillToken(raw);
            if (!professionalSkills.includes(canon)) {
                professionalSkills.push(canon);
            }
        }
    }

    const allSkills = uniqueStrings([...professionalSkills, ...technicalSkills], 20);

    // 4. Domain & Role derivation
    const { primaryDomains, secondaryDomains, roles } = deriveCareerDomainsAndRoles(education, allSkills, projects);

    // 5. Seniority determination
    let seniority = "mid";
    if (/\b(intern|internship|student|fresher|entry[- ]level|junior|trainee|0[\s-]?year)\b/i.test(resumeText)) {
        seniority = "junior";
    } else if (/\b(staff|principal|director|lead|senior|sr\.|manager|head)\b/i.test(resumeText)) {
        seniority = "senior";
    }

    // 6. Keywords
    const keywords = uniqueStrings([
        ...roles,
        ...allSkills,
        ...primaryDomains,
        ...(education.normalizedDegree ? [education.normalizedDegree] : []),
        ...(education.normalizedField ? [education.normalizedField] : []),
    ], 25);

    // 7. Summary
    const eduLabel = education.normalizedDegree || education.degree || "Professional";
    const domainLabel = primaryDomains.slice(0, 2).join(" / ") || "Career";
    const summary = `${eduLabel} background specializing in ${domainLabel} (${seniority}-level)`;

    return {
        education,
        primaryDomains,
        secondaryDomains,
        roles,
        skills: allSkills,
        technicalSkills: uniqueStrings(technicalSkills, 15),
        professionalSkills: uniqueStrings(professionalSkills, 15),
        projects,
        experience: [],
        certifications: [],
        languages: [],
        keywords,
        seniority,
        summary,
    };
}

// --------------------------------------------------------------------------
// 5. CONTROLLED SEARCH QUERY GENERATION (Education-First + Optional Query)
// --------------------------------------------------------------------------

export function buildSearchQueries(
    profile: ResumeProfile,
    location: string,
    filter?: string,
    manualQuery?: string
): string[] {
    const loc = location.trim();
    const primaryDomain = profile.primaryDomains[0] || "";
    const primaryRole = profile.roles[0] || (primaryDomain ? `${primaryDomain} Professional` : "Professional");
    const secondaryRole = profile.roles[1] || "";
    const topSkill = profile.skills[0] || "";
    const secondSkill = profile.skills[1] || "";

    // Case A: User supplied a specific manual search query (Discovery only!)
    if (manualQuery && manualQuery.trim()) {
        const q = manualQuery.trim();
        const queries = [
            [q, loc].filter(Boolean).join(" ").trim(),
            [q, primaryDomain, loc].filter(Boolean).join(" ").trim(),
            q,
        ];
        return uniqueStrings(queries, 4);
    }

    // Case B: Filter modifiers (intern / fresher)
    if (filter === "intern") {
        return uniqueStrings([
            `${primaryRole} Intern ${loc}`.trim(),
            `${primaryDomain} Intern ${loc}`.trim(),
            `${secondaryRole || primaryRole} Trainee ${loc}`.trim(),
            `Internship ${loc}`.trim(),
        ], 4);
    }

    if (filter === "fresher") {
        return uniqueStrings([
            `${primaryRole} Fresher ${loc}`.trim(),
            `${secondaryRole || primaryRole} Entry Level ${loc}`.trim(),
            `${primaryDomain} Graduate Trainee ${loc}`.trim(),
            `${primaryRole} ${loc}`.trim(),
        ], 4);
    }

    // Case C: Standard multi-query targeting
    // Query 1: Primary role + location
    // Query 2: Secondary role + location
    // Query 3: Primary role + key skill + location
    // Query 4: Secondary role / domain + second skill + location
    const queries = [
        [primaryRole, loc].filter(Boolean).join(" ").trim(),
        secondaryRole ? [secondaryRole, loc].filter(Boolean).join(" ").trim() : "",
        topSkill ? [primaryRole, topSkill, loc].filter(Boolean).join(" ").trim() : "",
        (secondaryRole || primaryDomain) && secondSkill
            ? [secondaryRole || primaryDomain, secondSkill, loc].filter(Boolean).join(" ").trim()
            : "",
    ].filter(Boolean);

    return uniqueStrings(queries, 4);
}

// --------------------------------------------------------------------------
// 6. LOCATION MATCHING
// --------------------------------------------------------------------------

const INDIA_CITY_SYNONYMS: Record<string, string[]> = {
    bangalore: ["bangalore", "bengaluru"],
    bengaluru: ["bangalore", "bengaluru"],
    hyderabad: ["hyderabad", "secunderabad"],
    mumbai: ["mumbai", "bombay", "navi mumbai", "thane"],
    delhi: ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "noida"],
    ncr: ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "noida"],
    pune: ["pune"],
    chennai: ["chennai", "madras"],
    gurgaon: ["gurgaon", "gurugram", "ncr", "delhi"],
    gurugram: ["gurgaon", "gurugram", "ncr", "delhi"],
    noida: ["noida", "ncr", "delhi"],
    kolkata: ["kolkata", "calcutta"],
    ahmedabad: ["ahmedabad"],
};

function indiaCitySynonyms(pref: string): string[] | null {
    for (const [city, group] of Object.entries(INDIA_CITY_SYNONYMS)) {
        if (pref.includes(city)) return group;
    }
    return null;
}

function locationMatches(jobLocation: string, preferred: string, remote: boolean): { score: number; reason?: string } {
    const pref = preferred.trim().toLowerCase();
    if (!pref) return { score: remote ? 8 : 0, reason: remote ? "Remote-friendly opening" : undefined };

    const loc = jobLocation.toLowerCase();
    const indiaGroup = indiaCitySynonyms(pref);
    const locIsIndia =
        loc.includes("india") ||
        /(^|,\s*)in(\s*$|\s*,)/.test(loc) ||
        (indiaGroup ? indiaGroup.some((c) => loc.includes(c)) : false);

    if (pref.includes("remote") || pref === "anywhere") {
        const wantsIndia = indiaGroup !== null || pref.includes("india");
        if (wantsIndia && remote && locIsIndia) {
            return { score: 32, reason: "Remote role based in India" };
        }
        return remote || loc.includes("remote") || loc.includes("worldwide") || loc.includes("anywhere")
            ? { score: 28, reason: "Matches remote preference" }
            : { score: 0 };
    }

    if (indiaGroup) {
        const cityHit = indiaGroup.some((c) => loc.includes(c));
        if (cityHit) return { score: 34, reason: `Location match: ${preferred} (India)` };
        if (locIsIndia) {
            return { score: 20, reason: `India-based opening near ${preferred}` };
        }
    }

    const tokens = pref.split(/[\s,/|-]+/).filter((t) => t.length > 2);
    const hit = tokens.some((t) => loc.includes(t));
    if (hit) return { score: 30, reason: `Location match: ${preferred}` };
    if (remote || loc.includes("remote") || loc.includes("worldwide") || loc.includes("anywhere")) {
        return { score: 14, reason: "Remote option for your preferred location" };
    }
    return { score: 0 };
}

// --------------------------------------------------------------------------
// 7. MULTI-FACTOR JOB MATCHING & RANKING
// Baseline: Education 35%, Skills 30%, Projects 15%, Exp 10%, Certs 5%, Location 5%
// --------------------------------------------------------------------------

export function scoreJob(
    job: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">,
    profile: ResumeProfile,
    preferredLocation: string,
    filter?: string,
    manualQuery?: string
): MatchedJob {
    const hay = `${job.role} ${job.company} ${job.location} ${job.tags.join(" ")} ${job.fullDescription || job.description}`.toLowerCase();
    const reasons: string[] = [];

    // 1. Education / Domain Match Score (Weight: 35%)
    // CRITICAL: Manual query does NOT corrupt candidate's education compatibility score!
    let educationMatchScore = 20;
    let educationExplanation = "General background compatibility";

    const degreeName = profile.education.degree || profile.education.normalizedDegree || "";
    const primaryDomain = profile.primaryDomains[0] || "";

    const matchesPrimaryDomain = profile.primaryDomains.some((d) => hay.includes(d.toLowerCase()));
    const matchesPrimaryRole = profile.roles.some((r) => {
        const roleLower = r.toLowerCase();
        return hay.includes(roleLower) || roleLower.split(/\s+/).some((w) => w.length > 3 && hay.includes(w));
    });

    const targetRole = profile.roles[0] || primaryDomain || "this role";
    if (matchesPrimaryRole || matchesPrimaryDomain) {
        educationMatchScore = 92;
        educationExplanation = degreeName
            ? `✓ ${degreeName} is relevant to ${targetRole} roles`
            : `✓ Relevant to ${primaryDomain || "your career domain"}`;
    } else {
        const matchesSecondary = profile.secondaryDomains.some((d) => hay.includes(d.toLowerCase()));
        if (matchesSecondary) {
            educationMatchScore = 65;
            educationExplanation = `✓ Aligns with secondary career transition (${profile.secondaryDomains[0]})`;
        } else {
            educationMatchScore = 15;
            educationExplanation = "△ Different career domain from education";
        }
    }
    reasons.push(educationExplanation);

    if (manualQuery && manualQuery.trim() && hay.includes(manualQuery.toLowerCase().trim())) {
        reasons.push(`✓ Matches searched role: ${manualQuery.trim()}`);
    }

    // 2. Safe Token-Aware Skills Match Score (Weight: 30%)
    // Uses matchesSkillToken to avoid false positives (e.g. Java matching JavaScript)
    const skillHits = profile.skills.filter((s) => matchesSkillToken(hay, s));
    let skillsMatchScore = 20;
    let skillsExplanation = "";

    if (skillHits.length >= 3) {
        skillsMatchScore = 95;
        skillsExplanation = `✓ Skills: ${skillHits.slice(0, 4).join(", ")}`;
    } else if (skillHits.length === 2) {
        skillsMatchScore = 80;
        skillsExplanation = `✓ Skills: ${skillHits.join(", ")}`;
    } else if (skillHits.length === 1) {
        skillsMatchScore = 60;
        skillsExplanation = `✓ Skill: ${skillHits[0]}`;
    } else {
        skillsMatchScore = 20;
        skillsExplanation = "△ Few matching skills identified";
    }
    reasons.push(skillsExplanation);

    // 3. Projects Match Score (Weight: 15%)
    let projectsMatchScore = 40;
    let projectsExplanation = "△ Limited project relevance";

    const matchedProject = profile.projects.find((p) => {
        const pText = `${p.title} ${p.domain || ""} ${(p.technologies || []).join(" ")}`.toLowerCase();
        return (
            hay.includes(p.title.toLowerCase()) ||
            pText.split(/[\s,-]+/).some((w) => w.length > 4 && hay.includes(w))
        );
    });

    if (matchedProject) {
        projectsMatchScore = 95;
        projectsExplanation = `✓ Project: ${matchedProject.title}`;
        reasons.push(projectsExplanation);
    } else if (profile.projects.length === 0) {
        projectsMatchScore = 50;
    }

    // 4. Experience & Seniority Match Score (Weight: 10%)
    let experienceMatchScore = 60;
    let experienceExplanation = "";

    if (filter === "intern") {
        if (job.type === "intern" || /\b(intern|internship|trainee|apprentice|student|summer)\b/i.test(hay)) {
            experienceMatchScore = 95;
            experienceExplanation = "✓ Internship match";
            reasons.unshift(experienceExplanation);
        }
    } else if (filter === "fresher" && /\b(fresher|entry|0[\s-]?year|graduate|junior)\b/i.test(hay)) {
        experienceMatchScore = 95;
        experienceExplanation = "✓ Fresher / Entry-Level friendly";
        reasons.push(experienceExplanation);
    } else if (profile.seniority === "junior" && (job.type === "intern" || /\b(fresher|entry|junior)\b/i.test(hay))) {
        experienceMatchScore = 85;
        experienceExplanation = "✓ Aligned for junior / entry-level";
        reasons.push(experienceExplanation);
    } else if (profile.seniority === "senior" && /\b(senior|staff|lead|principal|manager)\b/i.test(job.role)) {
        experienceMatchScore = 90;
        experienceExplanation = "✓ Seniority aligned";
        reasons.push(experienceExplanation);
    }

    // 5. Location Match (Weight: 5%)
    const loc = locationMatches(job.location, preferredLocation, job.remote);
    const locationScore = loc.score > 25 ? 95 : loc.score > 10 ? 70 : 30;
    if (loc.reason) reasons.push(loc.reason);

    // 6. Certifications Score (Weight: 5%)
    let certificationMatchScore = 50;
    if (profile.certifications.some((c) => matchesSkillToken(hay, c))) {
        certificationMatchScore = 95;
    }

    // Dynamic requirement weighting
    let wEdu = 0.35;
    let wSkills = 0.30;
    let wProj = 0.15;
    let wExp = 0.10;
    let wCert = 0.05;
    let wLoc = 0.05;

    // If job description contains explicit mandatory requirement
    if (/\b(must\s+have|mandatory|required)\s+(?:a\s+)?(degree|b\.?com|b\.?tech|b\.?e|mba)\b/i.test(hay)) {
        wEdu = 0.45;
        wProj = 0.10;
        wLoc = 0.00;
    } else if (/\b(\d+)\s*(?:\+|plus)?\s*years?\s+(?:of\s+)?experience\s+required\b/i.test(hay)) {
        wExp = 0.20;
        wSkills = 0.25;
        wLoc = 0.00;
    } else if (/\b(mandatory\s+certification|certified\s+is\s+required|mandatory\s+cpa|mandatory\s+ca)\b/i.test(hay)) {
        wCert = 0.15;
        wProj = 0.10;
        wLoc = 0.00;
    }

    // Weighted Overall Score
    const rawWeighted =
        educationMatchScore * wEdu +
        skillsMatchScore * wSkills +
        projectsMatchScore * wProj +
        experienceMatchScore * wExp +
        certificationMatchScore * wCert +
        locationScore * wLoc;

    const finalScore = Math.max(5, Math.min(98, Math.round(rawWeighted)));

    const matchBreakdown: MatchBreakdown = {
        educationMatchScore,
        skillsMatchScore,
        projectsMatchScore,
        experienceMatchScore,
        certificationMatchScore,
        overallMatchScore: finalScore,
        educationExplanation,
        skillsExplanation,
        projectsExplanation,
        locationExplanation: loc.reason,
        experienceExplanation,
    };

    return {
        ...job,
        matchPercent: finalScore,
        matchReasons: uniqueStrings(reasons, 5),
        matchBreakdown,
    };
}

// --------------------------------------------------------------------------
// 8. ROBUST DEDUPLICATION
// --------------------------------------------------------------------------

export function deduplicateJobs<T extends { id: string; company: string; role: string; location?: string; applyUrl: string; fullDescription?: string; description?: string }>(jobs: T[]): T[] {
    const seenUrls = new Map<string, T>();
    const seenSignatures = new Map<string, T>();

    function normalizeString(str: string): string {
        return str
            .toLowerCase()
            .replace(/\b(inc|incorporated|pvt|ltd|limited|llc|gmbh|co|corporation|corp|india)\b/gi, "")
            .replace(/[^a-z0-9]/gi, "")
            .trim();
    }

    const out: T[] = [];

    for (const job of jobs) {
        if (!job.applyUrl) continue;

        const cleanUrl = job.applyUrl.split("?")[0].replace(/\/+$/, "").toLowerCase();
        const normCo = normalizeString(job.company);
        const normRole = normalizeString(job.role);
        const normLoc = normalizeString((job.location || "").split(/[/,-]/)[0]);
        const sig = `${normCo}::${normRole}::${normLoc}`;

        const existingByUrl = cleanUrl.length > 10 ? seenUrls.get(cleanUrl) : undefined;
        const existingBySig = seenSignatures.get(sig);
        const existing = existingByUrl || existingBySig;

        if (existing) {
            const existingLen = (existing.fullDescription || existing.description || "").length;
            const currentLen = (job.fullDescription || job.description || "").length;
            if (currentLen > existingLen) {
                const idx = out.indexOf(existing);
                if (idx !== -1) {
                    out[idx] = job;
                    if (cleanUrl.length > 10) seenUrls.set(cleanUrl, job);
                    seenSignatures.set(sig, job);
                }
            }
            continue;
        }

        if (cleanUrl.length > 10) seenUrls.set(cleanUrl, job);
        seenSignatures.set(sig, job);
        out.push(job);
    }

    return out;
}

// --------------------------------------------------------------------------
// 9. DATA SOURCES (Adzuna, Remotive, Arbeitnow, RemoteOK) with FULL JD PRESERVATION
// --------------------------------------------------------------------------

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, {
            signal: ctrl.signal,
            headers: {
                "User-Agent": "ProInterviewJobMatcher/2.0",
                Accept: "application/json",
            },
            next: { revalidate: 0 },
        });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchRemotive(query: string): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">[]> {
    const url = `https://remotive.com/api/remote-jobs?limit=30${query ? `&search=${encodeURIComponent(query)}` : ""}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
        jobs?: Array<{
            id: number | string;
            url: string;
            title: string;
            company_name: string;
            tags?: string[];
            job_type?: string;
            publication_date?: string;
            candidate_required_location?: string;
            salary?: string;
            description?: string;
        }>;
    };
    return (data.jobs || []).map((j) => {
        const fullDesc = stripHtml(j.description || "").slice(0, 8000);
        return {
            id: `remotive_${j.id}`,
            company: j.company_name || "Unknown",
            role: j.title || "Role",
            location: j.candidate_required_location || "Remote",
            type: normalizeType(j.job_type),
            remote: true,
            tags: (j.tags || []).slice(0, 8),
            salaryRange: j.salary || undefined,
            description: fullDesc.slice(0, 320),
            fullDescription: fullDesc,
            applyUrl: j.url,
            postedAt: (j.publication_date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
            source: "Remotive",
        };
    });
}

async function fetchArbeitnow(query: string): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">[]> {
    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
        data?: Array<{
            slug: string;
            company_name: string;
            title: string;
            description?: string;
            remote?: boolean;
            url: string;
            tags?: string[];
            job_types?: string[];
            location?: string;
            created_at?: string;
        }>;
    };
    return (data.data || []).slice(0, 40).map((j) => {
        const fullDesc = stripHtml(j.description || "").slice(0, 8000);
        return {
            id: `arbeitnow_${j.slug}`,
            company: j.company_name || "Unknown",
            role: j.title || "Role",
            location: j.location || (j.remote ? "Remote" : "Unspecified"),
            type: normalizeType((j.job_types || [])[0]),
            remote: Boolean(j.remote),
            tags: (j.tags || []).slice(0, 8),
            description: fullDesc.slice(0, 320),
            fullDescription: fullDesc,
            applyUrl: j.url,
            postedAt: (j.created_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
            source: "Arbeitnow",
        };
    });
}

async function fetchRemoteOK(query: string): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">[]> {
    const res = await fetchWithTimeout("https://remoteok.com/api");
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
        id?: string | number;
        slug?: string;
        company?: string;
        position?: string;
        tags?: string[];
        description?: string;
        location?: string;
        apply_url?: string;
        url?: string;
        date?: string;
        salary_min?: number;
        salary_max?: number;
    }>;
    const q = query.toLowerCase();
    const jobs = data
        .filter((j) => j && j.position && (j.apply_url || j.url))
        .filter((j) => {
            if (!q) return true;
            const hay = `${j.position} ${j.company} ${(j.tags || []).join(" ")} ${j.location}`.toLowerCase();
            return q.split(/\s+/).some((token) => token.length > 2 && hay.includes(token));
        })
        .slice(0, 40);

    return jobs.map((j) => {
        const salary =
            j.salary_min && j.salary_max
                ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round(j.salary_max / 1000)}k`
                : undefined;
        const fullDesc = stripHtml(j.description || "").slice(0, 8000);
        return {
            id: `remoteok_${j.id || j.slug}`,
            company: j.company || "Unknown",
            role: j.position || "Role",
            location: j.location || "Remote",
            type: "full-time" as const,
            remote: true,
            tags: (j.tags || []).slice(0, 8),
            salaryRange: salary,
            description: fullDesc.slice(0, 320),
            fullDescription: fullDesc,
            applyUrl: j.apply_url || j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
            postedAt: (j.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
            source: "RemoteOK",
        };
    });
}

async function fetchAdzunaIndia(
    query: string,
    location: string
): Promise<Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];

    const country = process.env.ADZUNA_COUNTRY || "in";

    const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "30",
        "content-type": "application/json",
    });
    if (query) params.set("what", query);
    const where = location && !location.toLowerCase().includes("remote") ? location : "";
    if (where) params.set("where", where);

    const url = `https://api.adzuna.com/v1/api/jobs/${country.toLowerCase()}/search/1?${params.toString()}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
        results?: Array<{
            id?: string | number;
            title?: string;
            company?: { display_name?: string };
            location?: { display_name?: string };
            description?: string;
            redirect_url?: string;
            created?: string;
            contract_type?: string;
            contract_time?: string;
            salary_min?: number;
            salary_max?: number;
            category?: { label?: string };
        }>;
    };
    return (data.results || [])
        .filter((j) => j.redirect_url)
        .slice(0, 40)
        .map((j) => {
            const salary =
                j.salary_min && j.salary_max
                    ? `₹${Math.round(j.salary_min / 1000)}k–₹${Math.round(j.salary_max / 1000)}k`
                    : undefined;
            const jobLocation = j.location?.display_name || "India";
            const fullDesc = stripHtml(j.description || "").slice(0, 8000);
            return {
                id: `adzuna_${j.id}`,
                company: j.company?.display_name || "Unknown",
                role: j.title || "Role",
                location: jobLocation,
                type: normalizeType(j.contract_type || j.contract_time),
                remote: /remote/i.test(jobLocation),
                tags: j.category?.label ? [j.category.label] : [],
                salaryRange: salary,
                description: fullDesc.slice(0, 320),
                fullDescription: fullDesc,
                applyUrl: j.redirect_url || "",
                postedAt: (j.created || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
                source: country.toLowerCase() === "in" ? "Adzuna India" : `Adzuna (${country.toUpperCase()})`,
            };
        });
}

// --------------------------------------------------------------------------
// 10. DIVERSE CURATED INDIA LISTINGS (Complete Descriptions)
// --------------------------------------------------------------------------

export const INDIA_FALLBACK_JOBS: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">[] = [
    // Commerce / Accounting / Finance
    {
        id: "job_in_deloitte_accountant",
        company: "Deloitte India",
        role: "Accounts Executive / Audit Associate",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Accounting", "Excel", "Tally", "GST", "Auditing"],
        salaryRange: "₹5L–₹8L",
        description: "Join Deloitte's audit and enterprise finance practice in Bangalore. Manage financial accounts, ledgers, reconciliations, GST compliance, and audit schedules.",
        fullDescription: `Role: Accounts Executive / Audit Associate at Deloitte India, Bangalore.
Requirements:
- Education: Bachelor of Commerce (B.Com) or Master of Commerce (M.Com) required.
- Required Skills: Accounting, Financial Accounting, Tally, Advanced Excel, GST compliance, TDS, Bank Reconciliation.
- Experience: 1 to 3 years in accounting or auditing.
Responsibilities:
- Maintain general ledgers, trial balance, and balance sheet schedules.
- File monthly GST returns and coordinate statutory audit documentation.
- Preferred: Knowledge of SAP or Power BI for financial reporting.`,
        applyUrl: "https://www2.deloitte.com/in/en/careers.html",
        postedAt: "2026-08-01",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_ey_finance_intern",
        company: "EY India",
        role: "Finance & Taxation Intern",
        location: "Hyderabad / Bangalore",
        type: "intern",
        remote: false,
        tags: ["Finance", "GST", "Direct Tax", "Excel", "Accounting"],
        salaryRange: "₹30k–₹45k / month Stipend",
        description: "Internship for B.Com/M.Com/MBA Finance students. Assist with statutory tax filings, financial statements, and client compliance reviews.",
        fullDescription: `Role: Finance & Taxation Intern at EY India, Hyderabad / Bangalore.
Requirements:
- Education: Enrolled in or completed B.Com, M.Com, or MBA Finance.
- Required Skills: Accounting basics, Excel, GST, Direct Tax calculations.
- Preferred Skills: Tally, Financial Modeling.
Responsibilities:
- Assist audit seniors with tax documentation, voucher verification, and ledger reconciliation.`,
        applyUrl: "https://www.ey.com/en_in/careers",
        postedAt: "2026-08-02",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_hdfc_financial_analyst",
        company: "HDFC Bank",
        role: "Financial Analyst / Credit Operations",
        location: "Bangalore / Mumbai",
        type: "full-time",
        remote: false,
        tags: ["Financial Analysis", "Excel", "Banking", "Power BI", "Forecasting"],
        salaryRange: "₹6L–₹10L",
        description: "Analyze commercial banking portfolios, credit metrics, and financial forecasting models for business banking divisions.",
        fullDescription: `Role: Financial Analyst at HDFC Bank.
Requirements:
- Education: MBA Finance, B.Com, or CFA candidate.
- Required Skills: Financial Analysis, Financial Modeling, Advanced Excel, Valuation, Ratio Analysis.
- Preferred: Power BI, SQL, Python for financial analytics.
Responsibilities:
- Evaluate commercial credit portfolios, risk metrics, and prepare executive management dashboards.`,
        applyUrl: "https://www.hdfcbank.com/personal/careers",
        postedAt: "2026-08-03",
        source: "ProInterview curated (India)",
    },
    // Mechanical Engineering
    {
        id: "job_in_tatamotors_mech",
        company: "Tata Motors",
        role: "Graduate Mechanical Engineer (CAD & Manufacturing)",
        location: "Pune / Bangalore",
        type: "full-time",
        remote: false,
        tags: ["AutoCAD", "CAD", "Manufacturing", "SolidWorks", "Machine Design"],
        salaryRange: "₹6.5L–₹9.5L",
        description: "Design automotive sub-assemblies, production fixtures, and CAD component modeling for new generation commercial vehicle platforms.",
        fullDescription: `Role: Graduate Mechanical Engineer at Tata Motors, Pune / Bangalore.
Requirements:
- Education: B.Tech / B.E in Mechanical Engineering (Mandatory).
- Required Skills: AutoCAD, CAD, SolidWorks, Manufacturing principles, Machine Design, GD&T.
- Preferred Skills: Ansys, Catia, Lean Six Sigma.
Responsibilities:
- Model vehicle chassis and powertrain brackets. Generate 2D manufacturing drawings with tolerances.`,
        applyUrl: "https://www.tatamotors.com/careers/",
        postedAt: "2026-08-01",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_lt_heavy_mech_intern",
        company: "L&T Heavy Engineering",
        role: "Mechanical Design Intern",
        location: "Bangalore",
        type: "intern",
        remote: false,
        tags: ["AutoCAD", "CAD", "Machine Design", "Manufacturing"],
        salaryRange: "₹25k–₹35k / month Stipend",
        description: "Internship in mechanical equipment modeling, drafting, engineering calculations, and shop-floor manufacturing validation.",
        fullDescription: `Role: Mechanical Design Intern at L&T Heavy Engineering, Bangalore.
Requirements:
- Education: Currently pursuing or recently completed B.Tech / B.E Mechanical Engineering.
- Required Skills: AutoCAD, 3D modeling, Drafting.
Responsibilities:
- Assist engineering team with 3D CAD modeling, bill of materials, and pressure vessel design calculations.`,
        applyUrl: "https://www.larsentoubro.com/careers/",
        postedAt: "2026-08-02",
        source: "ProInterview curated (India)",
    },
    // Civil Engineering
    {
        id: "job_in_lt_civil",
        company: "L&T Construction",
        role: "Graduate Civil Engineer / Site Trainee",
        location: "Bangalore / Hyderabad",
        type: "full-time",
        remote: false,
        tags: ["AutoCAD", "STAAD", "Construction", "Structural Design", "Site Execution"],
        salaryRange: "₹5.5L–₹8.5L",
        description: "Supervise major infrastructure projects, quality audits, site execution, and structural design coordination across urban metro projects.",
        fullDescription: `Role: Graduate Civil Engineer / Site Trainee at L&T Construction.
Requirements:
- Education: B.Tech / B.E in Civil Engineering (Mandatory).
- Required Skills: AutoCAD, STAAD, Structural Analysis, Construction Site Supervision, Surveying, BOQ.
Responsibilities:
- Supervise concrete casting, bar bending schedule verification, structural load testing, and contractor quality audits.`,
        applyUrl: "https://www.lntecc.com/careers/",
        postedAt: "2026-08-02",
        source: "ProInterview curated (India)",
    },
    // Business / Management / Operations
    {
        id: "job_in_unilever_ops",
        company: "Hindustan Unilever",
        role: "Operations & Marketing Trainee (Fresher)",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Operations", "Marketing", "Supply Chain", "Business Management"],
        salaryRange: "₹8L–₹13L",
        description: "Management trainee role across FMCG consumer operations, brand market strategy, vendor logistics, and channel sales management.",
        fullDescription: `Role: Operations & Marketing Trainee at Hindustan Unilever, Bangalore.
Requirements:
- Education: BBA, MBA, or Bachelor's degree in any discipline.
- Required Skills: Operations management, Market research, Vendor coordination, Communication, Excel.`,
        applyUrl: "https://www.hul.co.in/careers/",
        postedAt: "2026-08-04",
        source: "ProInterview curated (India)",
    },
    // Life Sciences / Pharmacy
    {
        id: "job_in_sunpharma_qc",
        company: "Sun Pharma",
        role: "Quality Control Chemist / Pharmacist",
        location: "Bangalore / Hyderabad",
        type: "full-time",
        remote: false,
        tags: ["Pharmacy", "Quality Control", "Chemistry", "GMP", "Formulation"],
        salaryRange: "₹4.5L–₹7L",
        description: "Perform pharmaceutical formulations testing, laboratory analysis, raw material quality checks, and GMP regulatory compliance.",
        fullDescription: `Role: Quality Control Chemist / Pharmacist at Sun Pharma.
Requirements:
- Education: B.Pharm or M.Pharm degree (Mandatory).
- Required Skills: Pharmacology, HPLC, GMP compliance, Quality Control testing, Drug Formulation.`,
        applyUrl: "https://sunpharma.com/careers/",
        postedAt: "2026-08-05",
        source: "ProInterview curated (India)",
    },
    // Electronics / VLSI / Semiconductor / Embedded Systems
    {
        id: "job_in_ti_vlsi",
        company: "Texas Instruments India",
        role: "Analog Layout & Physical Design Engineer",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["VLSI", "Cadence Virtuoso", "Analog Layout", "Physical Design", "DRC", "LVS"],
        salaryRange: "₹8L–₹14L",
        description: "Design and verify analog/mixed-signal IC layouts for TI's power management and signal chain product lines at the Bangalore design center.",
        fullDescription: `Role: Analog Layout & Physical Design Engineer at Texas Instruments India, Bangalore.
Requirements:
- Education: B.Tech / B.E / M.Tech in Electronics, Electrical, or VLSI Design (Mandatory).
- Required Skills: Cadence Virtuoso, Analog Layout, Physical Design, DRC, LVS, ERC, CMOS process technology.
- Preferred Skills: Calibre, HSpice, Spectre simulation, Floorplanning, Matching techniques.
- Experience: 0 to 3 years in analog/mixed-signal IC layout.
Responsibilities:
- Create and optimize transistor-level layouts for ADCs, LDOs, and voltage references.
- Run and debug DRC/LVS/ERC checks, perform parasitic extraction, and ensure silicon-accurate layouts.
- Collaborate with circuit design and verification teams on tapeout milestones.`,
        applyUrl: "https://careers.ti.com/",
        postedAt: "2026-08-01",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_bosch_embedded",
        company: "Bosch India",
        role: "Embedded Systems Engineer (Fresher / 1-2 Years)",
        location: "Bangalore / Coimbatore",
        type: "full-time",
        remote: false,
        tags: ["Embedded C", "RTOS", "ARM", "Microcontroller", "FPGA", "CAN"],
        salaryRange: "₹6L–₹10L",
        description: "Develop embedded firmware for automotive ECU modules, sensor interfaces, and real-time control systems at Bosch's engineering center.",
        fullDescription: `Role: Embedded Systems Engineer at Bosch India, Bangalore / Coimbatore.
Requirements:
- Education: B.Tech / B.E / M.Tech in Electronics, Electrical, Embedded Systems, or Instrumentation (Mandatory).
- Required Skills: Embedded C, ARM Cortex microcontrollers, RTOS (FreeRTOS / QNX), I2C, SPI, UART, CAN protocol.
- Preferred Skills: FPGA (Xilinx/Vivado), MATLAB/Simulink, PCB design, AUTOSAR.
- Experience: 0 to 2 years in embedded firmware development.
Responsibilities:
- Write and optimize low-level firmware for automotive ECUs and ADAS sensor modules.
- Interface with hardware teams for bring-up, debugging, and integration testing.
- Develop unit tests and perform hardware-in-the-loop (HIL) validation.`,
        applyUrl: "https://www.bosch.in/careers/",
        postedAt: "2026-08-02",
        source: "ProInterview curated (India)",
    },
    // Software / IT / Data
    {
        id: "job_in_google_intern",
        company: "Google India",
        role: "Software Engineering Intern",
        location: "Bangalore / Hyderabad",
        type: "intern",
        remote: false,
        tags: ["C++", "Java", "Python", "Data Structures", "Algorithms"],
        salaryRange: "₹80k–₹1.2L / month Stipend",
        description: "Join Google's engineering teams in Bangalore or Hyderabad as a software intern. Work on scalable distributed systems, developer tools, or AI services.",
        fullDescription: `Role: Software Engineering Intern at Google India.
Requirements:
- Education: B.Tech / B.E in Computer Science, IT, or related technical field.
- Required Skills: Java or C++ or Python, Data Structures, Algorithms, System Design basics.
Responsibilities:
- Write clean, maintainable code for high-throughput distributed systems and cloud services.`,
        applyUrl: "https://careers.google.com/jobs/results/",
        postedAt: "2026-08-01",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_flipkart_sde1",
        company: "Flipkart",
        role: "SDE 1 (1-2 Years Experience)",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Java", "Spring Boot", "Kafka", "MySQL"],
        salaryRange: "₹18L–₹26L",
        description: "High-scale backend engineering for early-career developers. Work on inventory, cart, and high-concurrency checkout services.",
        fullDescription: `Role: Software Development Engineer 1 at Flipkart, Bangalore.
Requirements:
- Education: B.Tech / B.E in Computer Science or related degree.
- Required Skills: Java, Spring Boot, MySQL, Kafka, REST API design, Microservices.
- Experience: 1 to 2 years in software development.
Responsibilities:
- Build low-latency APIs and order processing microservices handling millions of daily transactions.`,
        applyUrl: "https://www.flipkartcareers.com/",
        postedAt: "2026-07-29",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_razorpay_be",
        company: "Razorpay",
        role: "Backend Engineer (1-3 Years Experience)",
        location: "Bangalore",
        type: "full-time",
        remote: false,
        tags: ["Node.js", "Payments", "API", "TypeScript"],
        salaryRange: "₹18L–₹32L",
        description: "Build payment and banking infrastructure powering businesses across India with clean architecture and microservices.",
        fullDescription: `Role: Backend Engineer at Razorpay, Bangalore.
Requirements:
- Education: B.Tech / B.E / MCA in Computer Science.
- Required Skills: Node.js, TypeScript, PostgreSQL, REST APIs, Microservices.
- Experience: 1 to 3 years building scalable web services.`,
        applyUrl: "https://razorpay.com/jobs/",
        postedAt: "2026-07-28",
        source: "ProInterview curated (India)",
    },
    {
        id: "job_in_remote_india_devrel",
        company: "Postman",
        role: "Developer Advocate (Remote India)",
        location: "Remote (India)",
        type: "full-time",
        remote: true,
        tags: ["API", "Community", "JavaScript", "TypeScript"],
        salaryRange: "₹18L–₹30L",
        description: "Fully remote position for engineers across India supporting the global API developer community with demos and tutorials.",
        fullDescription: `Role: Developer Advocate at Postman (Remote India).
Requirements:
- Education: Degree in Computer Science or equivalent practical experience.
- Required Skills: JavaScript, TypeScript, REST APIs, Technical Writing, Developer Relations.`,
        applyUrl: "https://www.postman.com/company/careers/",
        postedAt: "2026-07-30",
        source: "ProInterview curated (India)",
    },
];

// --------------------------------------------------------------------------
// 11. SEARCH MATCHING JOBS PIPELINE (Multi-Query Execution + Deduplication)
// --------------------------------------------------------------------------

export async function searchMatchingJobs(
    profile: ResumeProfile,
    preferredLocation: string,
    filter?: string,
    jobSearchQuery?: string
): Promise<{ jobs: MatchedJob[]; sourcesTried: string[]; queries: string[] }> {
    const queries = buildSearchQueries(profile, preferredLocation, filter, jobSearchQuery);
    const primary = queries[0] || (jobSearchQuery || profile.roles[0] || profile.primaryDomains[0] || "job");
    const secondary = queries[1] || "";
    const sourcesTried: string[] = [];
    const collected: Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">[] = [];

    const adzunaRole =
        (jobSearchQuery || profile.roles[0] || profile.primaryDomains[0] || "associate").trim() +
        (filter === "intern" ? " Intern" : filter === "fresher" ? " Fresher" : "");

    // Multi-query search execution across providers
    const tasks: Array<{ name: string; run: () => Promise<Omit<MatchedJob, "matchPercent" | "matchReasons" | "matchBreakdown">[]> }> = [
        { name: "Remotive", run: () => fetchRemotive(primary) },
        { name: "Arbeitnow", run: () => fetchArbeitnow(primary) },
        ...(secondary && secondary !== primary ? [{ name: "Arbeitnow (Secondary)", run: () => fetchArbeitnow(secondary) }] : []),
        { name: "RemoteOK", run: () => fetchRemoteOK(primary) },
        { name: "Adzuna India", run: () => fetchAdzunaIndia(adzunaRole, preferredLocation) },
    ];

    const settled = await Promise.allSettled(
        tasks.map(async (t) => {
            try {
                const rows = await t.run();
                return rows;
            } finally {
                const providerName = t.name.split(" ")[0];
                if (!sourcesTried.includes(providerName)) {
                    sourcesTried.push(providerName);
                }
            }
        })
    );

    for (const result of settled) {
        if (result.status === "fulfilled") collected.push(...result.value);
    }

    // Merge and robustly deduplicate by URL and normalized (company + role + location)
    const deduplicated = deduplicateJobs(collected);

    // Score and rank using factual compatibility
    const ranked = deduplicated
        .map((job) => scoreJob(job, profile, preferredLocation, filter, jobSearchQuery))
        .filter((j) => j.matchPercent >= 10)
        .sort((a, b) => b.matchPercent - a.matchPercent)
        .slice(0, 100);

    return { jobs: ranked, sourcesTried, queries };
}

export function webSearchUrls(
    profile: ResumeProfile,
    location: string,
    jobSearchQuery?: string
): { label: string; url: string }[] {
    const targetRole =
        (jobSearchQuery && jobSearchQuery.trim()) ||
        profile.roles[0] ||
        (profile.primaryDomains[0] ? `${profile.primaryDomains[0]} Professional` : "Professional");

    const q = encodeURIComponent([targetRole, "jobs", location].filter(Boolean).join(" "));
    return [
        { label: "Google Jobs search", url: `https://www.google.com/search?q=${q}` },
        {
            label: "LinkedIn Jobs search",
            url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(targetRole)}&location=${encodeURIComponent(location || "")}`,
        },
        {
            label: "Indeed search",
            url: `https://www.indeed.com/jobs?q=${encodeURIComponent(targetRole)}&l=${encodeURIComponent(location || "")}`,
        },
    ];
}
