export type StandardSectionType =
    | "personalInfo"
    | "summary"
    | "workExperience"
    | "education"
    | "projects"
    | "skills"
    | "certifications"
    | "languages"
    | "achievements"
    | "publications"
    | "volunteering"
    | "custom";

export interface DetectedSection {
    type: StandardSectionType;
    originalTitle: string;
    startIndex: number;
    endIndex: number;
    rawContent: string;
}

const SECTION_PATTERNS: Record<Exclude<StandardSectionType, "personalInfo" | "custom">, RegExp[]> = {
    summary: [
        /^(?:profile\s+summary|professional\s+summary|career\s+summary|executive\s+summary|profile\s+overview|personal\s+statement|about\s+me|career\s+objective|summary|objective|profile)[\s:]*$/i,
        /^(?:professional\s+profile|background\s+summary)[\s:]*$/i
    ],
    workExperience: [
        /^(?:experience|work\s+experience|professional\s+experience|employment\s+history|career\s+history|work\s+history|employment|relevant\s+experience|professional\s+background)[\s:]*$/i,
        /^(?:internship[s]?|internship\s+experience|industrial\s+training|training\s*&\s*internships?|practicum)[\s:]*$/i
    ],
    education: [
        /^(?:education|academic\s+background|academic\s+qualifications|qualifications|academic\s+history|education\s*&\s*training|educational\s+background|degrees|studies|schooling)[\s:]*$/i,
        /^(?:formal\s+education|academic\s+credentials)[\s:]*$/i
    ],
    projects: [
        /^(?:projects|key\s+projects|academic\s+projects|technical\s+projects|featured\s+projects|personal\s+projects|selected\s+projects|capstone\s+projects|research\s+projects|portfolio\s+projects|software\s+projects)[\s:]*$/i,
        /^(?:project\s+work|major\s+projects|development\s+projects)[\s:]*$/i
    ],
    skills: [
        /^(?:skills|technical\s+skills|core\s+competencies|key\s+skills|skills\s*&\s*(?:competencies|proficiencies|tools)|areas\s+of\s+expertise|proficiencies|tools\s*&\s*technologies|technology\s+stack|technical\s+proficiencies|programming\s+languages|domain\s+competencies)[\s:]*$/i,
        /^(?:it\s+skills|core\s+skills|technical\s+expertise)[\s:]*$/i
    ],
    certifications: [
        /^(?:certifications|certificates|licenses|certifications\s*&\s*licenses|courses\s*&\s*certifications|certifications\s*&\s*workshops|workshops\s*&\s*certifications|workshops|professional\s+certifications|training\s*&\s*certifications|credentials)[\s:]*$/i,
        /^(?:online\s+certifications|licenses\s*&\s*certifications)[\s:]*$/i
    ],
    languages: [
        /^(?:languages|languages\s+spoken|language\s+proficiency|languages\s+known|spoken\s+languages|linguistic\s+skills)[\s:]*$/i
    ],
    achievements: [
        /^(?:achievements|awards|awards\s*&\s*achievements|honors\s*&\s*awards|awards\s*&\s*honors|key\s+achievements|academic\s+honors|distinctions|accolades|fellowships\s*&\s*awards)[\s:]*$/i
    ],
    publications: [
        /^(?:publications|research\s+publications|patents|research\s+papers|conference\s+presentations|published\s+papers|patents\s*&\s*publications|white\s+papers)[\s:]*$/i
    ],
    volunteering: [
        /^(?:volunteer\s+experience|volunteering|community\s+service|volunteer\s+work|leadership\s*&\s*volunteering|extracurricular\s+activities|social\s+work|community\s+involvement)[\s:]*$/i
    ]
};

/**
 * Classifies a heading line into one of the standard section types or identifies it as custom.
 */
export function classifyHeading(line: string): { type: StandardSectionType; confidence: number } | null {
    const clean = line.replace(/^[•\-*▪▫–—✦✓#\d\.\)\s]+/, "").replace(/[\s:]+$/, "").trim();
    if (!clean || clean.length > 60) return null;

    for (const [secType, patterns] of Object.entries(SECTION_PATTERNS) as [StandardSectionType, RegExp[]][]) {
        for (const pattern of patterns) {
            if (pattern.test(clean)) {
                return { type: secType, confidence: 0.95 };
            }
        }
    }

    // Do not classify common job titles or professional headlines as custom sections
    const isCommonJobRole = /\b(engineer|developer|designer|analyst|manager|specialist|researcher|consultant|architect|lead|director|scientist|officer|supervisor|intern|assistant|administrator)\b/i.test(clean);
    if (isCommonJobRole) {
        return null;
    }

    // Never classify score, grade, marks, or GPA lines as section headings
    if (/\b(?:cgpa|gpa|percentage|grade|marks|score)\b/i.test(clean) || /^[0-9\.\s\/\%]+$/.test(clean)) {
        return null;
    }

    // Check if line looks like an unrecognized section heading:
    // - Short (3 to 45 chars)
    // - All uppercase OR Title Case without periods
    // - Not containing personal contact symbols (@, http, phone digits)
    const isHeaderCase = clean === clean.toUpperCase() && /[A-Z]/.test(clean);
    const isTitleCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+|\s+&\s+[A-Z][a-z]+)*$/.test(clean);
    const hasNoSentencePunctuation = !/[.?!]$/.test(clean);
    const hasNoContact = !clean.includes("@") && !clean.includes("http") && !/\d{5,}/.test(clean);

    if ((isHeaderCase || isTitleCase) && hasNoSentencePunctuation && hasNoContact && clean.length >= 3 && clean.length <= 45) {
        return { type: "custom", confidence: 0.7 };
    }

    return null;
}

/**
 * Splits raw resume text into segmented sections based on detected headings.
 */
export function detectSections(rawText: string): DetectedSection[] {
    const lines = rawText.split("\n");
    const sections: DetectedSection[] = [];
    let currentSection: { type: StandardSectionType; originalTitle: string; startLine: number; contentLines: string[] } | null = null;

    // Header content before the first section heading is personalInfo
    const personalInfoLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip divider rules or page headers
        if (/^[-–—_=]{3,}$/.test(trimmed) || /^page\s+\d/i.test(trimmed)) {
            continue;
        }

        const headingMatch = classifyHeading(trimmed);

        if (headingMatch && trimmed.length > 2 && !(headingMatch.type === "custom" && !currentSection && i < 4)) {
            if (currentSection) {
                sections.push({
                    type: currentSection.type,
                    originalTitle: currentSection.originalTitle,
                    startIndex: currentSection.startLine,
                    endIndex: i - 1,
                    rawContent: currentSection.contentLines.join("\n").trim()
                });
            }
            currentSection = {
                type: headingMatch.type,
                originalTitle: trimmed,
                startLine: i,
                contentLines: []
            };
        } else {
            if (currentSection) {
                currentSection.contentLines.push(line);
            } else {
                personalInfoLines.push(line);
            }
        }
    }

    if (currentSection) {
        sections.push({
            type: currentSection.type,
            originalTitle: currentSection.originalTitle,
            startIndex: currentSection.startLine,
            endIndex: lines.length - 1,
            rawContent: currentSection.contentLines.join("\n").trim()
        });
    }

    if (personalInfoLines.length > 0) {
        sections.unshift({
            type: "personalInfo",
            originalTitle: "Header & Personal Info",
            startIndex: 0,
            endIndex: sections.length > 0 ? sections[0].startIndex - 1 : lines.length - 1,
            rawContent: personalInfoLines.join("\n").trim()
        });
    }

    return sections;
}
