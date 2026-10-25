import { QualificationTier, ScoreType } from "./types";

interface EducationPattern {
    tier: QualificationTier;
    regex: RegExp;
}

const TIER_PATTERNS: EducationPattern[] = [
    {
        tier: "10th",
        regex: /\b(sslc|class\s*x\b|10th\b|tenth\b|secondary\s*school\b|matriculation\b|high\s*school\s*leaving\b|gcse|icse\s*10th|cbse\s*10th)\b/i
    },
    {
        tier: "12th",
        regex: /\b(puc|pre-university|class\s*xii\b|12th\b|twelfth\b|hsc|higher\s*secondary\b|intermediate\b|senior\s*secondary\b|a-levels|cbse\s*12th|isc\s*12th)\b/i
    },
    {
        tier: "vocational",
        regex: /\b(iti|industrial\s*training\s*institute|national\s*trade\s*certificate|ntc|vocational\s*certificate|vocational\s*training|trade\s*certificate)\b/i
    },
    {
        tier: "diploma",
        regex: /\b(polytechnic|diploma|associate\s*degree|advanced\s*diploma|pg\s*diploma|post\s*graduate\s*diploma|pgdm)\b/i
    },
    {
        tier: "phd",
        regex: /\b(ph\.?d\b|doctor\s*of\s*philosophy|doctorate|d\.?phil|post-doc|postdoctoral)\b/i
    },
    {
        tier: "pg",
        regex: /\b(master|m\.?tech|m\.?e\b|m\.?sc|m\.?s\b|m\.?com|mca|mba|m\.?b\.?a|m\.?pharm|m\.?arch|m\.?des|post\s*graduate)\b/i
    },
    {
        tier: "ug",
        regex: /\b(bachelor|b\.?tech|b\.?e\b|b\.?sc|b\.?s\b|b\.?com|bca|bba|b\.?a\b|b\.?pharm|b\.?arch|b\.?des|undergraduate|b\.?ed)\b/i
    }
];

/**
 * Classifies an education qualification into a standardized tier based on evidence.
 * If evidence is insufficient, returns "other" without guessing.
 */
export function classifyEducationTier(degreeName: string, fieldOfStudy = "", institution = ""): QualificationTier {
    const combined = `${degreeName} ${fieldOfStudy} ${institution}`.toLowerCase();

    for (const p of TIER_PATTERNS) {
        if (p.regex.test(combined)) {
            return p.tier;
        }
    }

    return "other";
}

/**
 * Parses and extracts score values and types (CGPA, percentage, GPA, marks) cleanly.
 */
export function extractScoreDetails(text: string): {
    scoreType: ScoreType;
    scoreValue: string;
    cleanedText: string;
} {
    if (!text) return { scoreType: "none", scoreValue: "", cleanedText: "" };

    let cleaned = text;

    // 1. Percentage: e.g. "65.92%", "88.5 %", "Percentage: 75%"
    const pctMatch = cleaned.match(/(?:percentage|marks|aggregate|score)?[:\s]*([0-9]{2}(?:\.[0-9]+)?\s*%)/i) ||
                     cleaned.match(/(?:percentage|aggregate)[:\s]*([0-9]{2}(?:\.[0-9]+)?)/i);
    if (pctMatch) {
        const rawNum = pctMatch[1].replace("%", "").trim();
        cleaned = cleaned.replace(pctMatch[0], "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();
        return {
            scoreType: "percentage",
            scoreValue: `${rawNum}%`,
            cleanedText: cleaned
        };
    }

    // 2. GPA on a 4.0 scale: e.g. "3.85 / 4.0", "GPA: 3.9"
    const gpa4Match = cleaned.match(/(?:gpa)[:\s]*([0-3]\.[0-9]{1,2}(?:\s*\/\s*4(?:\.0)?)?)/i);
    if (gpa4Match) {
        cleaned = cleaned.replace(gpa4Match[0], "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();
        return {
            scoreType: "gpa",
            scoreValue: gpa4Match[1].trim(),
            cleanedText: cleaned
        };
    }

    // 3. CGPA on a 10.0 scale: e.g. "CGPA: 6.91", "6.91 CGPA", "9.35 / 10"
    const cgpaMatch = cleaned.match(/(?:cgpa|grade)[:\s]*([0-9]{1,2}\.[0-9]{1,2}(?:\s*\/\s*10(?:\.0)?)?)/i) ||
                      cleaned.match(/\b([0-9]\.[0-9]{1,2})\s*(?:cgpa)\b/i) ||
                      cleaned.match(/(?:cgpa)[:\s]*([0-9]\.[0-9]{1,2})/i);
    if (cgpaMatch) {
        const numMatch = cgpaMatch[0].match(/([0-9]\.[0-9]{1,2})/);
        cleaned = cleaned.replace(cgpaMatch[0], "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();
        return {
            scoreType: "cgpa",
            scoreValue: numMatch ? numMatch[1] : cgpaMatch[1].trim(),
            cleanedText: cleaned
        };
    }

    // 4. Raw marks e.g. "540 / 600" or "Marks: 520"
    const marksMatch = cleaned.match(/(?:marks)[:\s]*([0-9]{3,4}(?:\s*\/\s*[0-9]{3,4})?)/i);
    if (marksMatch) {
        cleaned = cleaned.replace(marksMatch[0], "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();
        return {
            scoreType: "marks",
            scoreValue: marksMatch[1].trim(),
            cleanedText: cleaned
        };
    }

    return { scoreType: "none", scoreValue: "", cleanedText: cleaned };
}

/**
 * Splits glued degree and field of study, e.g. "B.E. in Computer Science" -> "B.E." and "Computer Science".
 */
export function separateDegreeAndField(rawDegree: string, currentField = ""): { degree: string; fieldOfStudy: string } {
    let degree = rawDegree.trim();
    let fieldOfStudy = currentField.trim();

    if (/\bin\b/i.test(degree)) {
        const parts = degree.split(/\bin\b/i);
        degree = parts[0].trim();
        if (!fieldOfStudy) {
            fieldOfStudy = parts.slice(1).join(" in ").trim();
        }
    } else if (/\s*[-–—|]\s*/.test(degree) && !fieldOfStudy) {
        const parts = degree.split(/\s*[-–—|]\s*/);
        if (parts.length === 2 && parts[1].length > 3) {
            degree = parts[0].trim();
            fieldOfStudy = parts[1].trim();
        }
    }

    return { degree, fieldOfStudy };
}
