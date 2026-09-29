/**
 * Utility for classifying career domains and making interview features
 * role-adaptive across Software, Core Engineering, and Business disciplines.
 */

export type CareerDomain = "tech_software" | "core_engineering" | "business_management";

export interface DomainCategoryOption {
    label: string;
    options: { value: string; label: string }[];
}

export const ROLE_OPTIONS_GROUPED: DomainCategoryOption[] = [
    {
        label: "Software & Technology",
        options: [
            { value: "Full Stack Engineer", label: "Full Stack Engineer" },
            { value: "Frontend Developer", label: "Frontend Developer" },
            { value: "Backend Developer", label: "Backend Developer" },
            { value: "DevOps Engineer", label: "DevOps Engineer" },
            { value: "AI/ML Engineer", label: "AI/ML Engineer" },
            { value: "Data Scientist", label: "Data Scientist" },
            { value: "Mobile App Developer", label: "Mobile App Developer" },
            { value: "Cloud Architect", label: "Cloud Architect" },
            { value: "Cybersecurity Analyst", label: "Cybersecurity Analyst" },
        ],
    },
    {
        label: "Core Engineering",
        options: [
            { value: "VLSI Design Engineer", label: "VLSI Design Engineer" },
            { value: "Embedded Systems Engineer", label: "Embedded Systems Engineer" },
            { value: "Hardware / Electronics Engineer", label: "Hardware / Electronics Engineer" },
            { value: "Mechanical Design Engineer", label: "Mechanical Design Engineer" },
            { value: "Civil / Structural Engineer", label: "Civil / Structural Engineer" },
            { value: "Robotics & Automation Engineer", label: "Robotics & Automation Engineer" },
            { value: "Electrical Power Engineer", label: "Electrical Power Engineer" },
        ],
    },
    {
        label: "Business, Product & Operations",
        options: [
            { value: "Product Manager", label: "Product Manager" },
            { value: "UI/UX Designer", label: "UI/UX Designer" },
            { value: "Financial Analyst", label: "Financial Analyst" },
            { value: "Business Analyst", label: "Business Analyst" },
            { value: "Growth & Digital Marketing Manager", label: "Growth & Digital Marketing Manager" },
            { value: "Human Resources / Talent Acquisition", label: "Human Resources / Talent Acquisition" },
            { value: "Operations & Supply Chain Manager", label: "Operations & Supply Chain Manager" },
            { value: "Management / Strategy Consultant", label: "Management / Strategy Consultant" },
        ],
    },
];

// Flat list for simple select components
export const ALL_ROLE_OPTIONS = ROLE_OPTIONS_GROUPED.flatMap((group) => group.options);

export const BROAD_COMPANY_OPTIONS: { value: string; label: string }[] = [
    // Tech & Cloud
    { value: "Google", label: "Google" },
    { value: "Microsoft", label: "Microsoft" },
    { value: "Amazon", label: "Amazon" },
    { value: "Apple", label: "Apple" },
    { value: "Meta", label: "Meta" },
    { value: "TCS", label: "TCS" },
    { value: "Infosys", label: "Infosys" },
    { value: "Stripe", label: "Stripe" },
    { value: "Uber", label: "Uber" },
    // Semiconductors & Core Engineering
    { value: "Intel", label: "Intel" },
    { value: "Qualcomm", label: "Qualcomm" },
    { value: "NVIDIA", label: "NVIDIA" },
    { value: "Texas Instruments", label: "Texas Instruments" },
    { value: "Larsen & Toubro", label: "Larsen & Toubro (L&T)" },
    { value: "Siemens", label: "Siemens" },
    { value: "Tesla", label: "Tesla" },
    { value: "General Electric", label: "General Electric (GE)" },
    // Finance, Consulting & Corporate
    { value: "Goldman Sachs", label: "Goldman Sachs" },
    { value: "JPMorgan Chase", label: "JPMorgan Chase" },
    { value: "McKinsey & Company", label: "McKinsey & Company" },
    { value: "Deloitte", label: "Deloitte" },
    { value: "Unilever", label: "Unilever" },
];

const CORE_ENGINEERING_KEYWORDS = [
    "vlsi", "embedded", "hardware", "electronics", "circuit", "verilog", "vhdl",
    "fpga", "mechanical", "civil", "structural", "robotics", "electrical", "cad",
    "autocad", "solidworks", "matlab", "automotive", "sensor", "firmware", "iot"
];

const BUSINESS_KEYWORDS = [
    "product manager", "pm", "ui/ux", "designer", "finance", "financial",
    "marketing", "hr", "human resources", "recruiter", "talent", "sales",
    "operations", "consultant", "consulting", "business analyst", "supply chain",
    "accountant", "accounting", "growth"
];

const SOFTWARE_KEYWORDS = [
    "software", "frontend", "backend", "full stack", "fullstack", "devops",
    "web", "developer", "programmer", "coding", "react", "node", "python",
    "java", "cloud", "aws", "mobile", "ios", "android", "machine learning",
    "ai", "data scientist", "data engineer", "qa", "test engineer"
];

/**
 * Normalizes input role(s) to determine whether it is a software/coding role.
 */
export function isSoftwareOrCodingRole(roleOrRoles?: string | string[] | null): boolean {
    if (!roleOrRoles) return false;
    const text = (Array.isArray(roleOrRoles) ? roleOrRoles.join(" ") : roleOrRoles).toLowerCase();

    // Check if explicitly matches core engineering or business first
    const isCore = CORE_ENGINEERING_KEYWORDS.some((kw) => text.includes(kw));
    const isBiz = BUSINESS_KEYWORDS.some((kw) => text.includes(kw));
    if (isCore || isBiz) {
        // If it specifically contains developer/engineer in software context, verify
        if (text.includes("embedded") || text.includes("firmware")) {
            // Firmware/Embedded may involve C/assembly coding
            return true;
        }
        return false;
    }

    return SOFTWARE_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * Classifies a given role or array of roles into a CareerDomain.
 */
export function getDomainForRole(roleOrRoles?: string | string[] | null): CareerDomain {
    if (!roleOrRoles) return "tech_software";
    const text = (Array.isArray(roleOrRoles) ? roleOrRoles.join(" ") : roleOrRoles).toLowerCase();

    if (CORE_ENGINEERING_KEYWORDS.some((kw) => text.includes(kw))) {
        return "core_engineering";
    }

    if (BUSINESS_KEYWORDS.some((kw) => text.includes(kw))) {
        return "business_management";
    }

    return "tech_software";
}

/**
 * Returns dynamic feature topics text appropriate for the user's role.
 */
export function getRoleTopicDescription(roleOrRoles?: string | string[] | null): string {
    const domain = getDomainForRole(roleOrRoles);
    switch (domain) {
        case "core_engineering":
            return "Core Fundamentals, Circuit/System Design & Behavioral";
        case "business_management":
            return "Domain Strategy, Case Studies & Behavioral";
        case "tech_software":
        default:
            return "DSA, System Architecture & Behavioral";
    }
}
