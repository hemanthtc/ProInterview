/**
 * Safe, token-aware skill and keyword matching utility.
 * Prevents false-positive substring matches (e.g., "Java" matching "JavaScript",
 * "React" matching "reactive", "Go" matching "Google", "C" matching arbitrary letters).
 */

export interface CanonicalSkillMapping {
    canonical: string;
    synonyms: string[];
    // Patterns or keywords that must NOT be matched for this skill
    negativeLookahead?: string[];
    // Whether this requires strict whole-token boundary matching
    strictBoundary?: boolean;
}

export const CANONICAL_SKILL_MAP: Record<string, CanonicalSkillMapping> = {
    javascript: {
        canonical: "JavaScript",
        synonyms: ["javascript", "js", "ecmascript"],
        strictBoundary: true,
    },
    java: {
        canonical: "Java",
        synonyms: ["java", "core java", "java 8", "java 11", "java 17", "java 21"],
        negativeLookahead: ["script", "scripting"],
        strictBoundary: true,
    },
    react: {
        canonical: "React",
        synonyms: ["react", "react.js", "reactjs"],
        negativeLookahead: ["ive", "ion", "ions", "ivity", "ant"],
        strictBoundary: true,
    },
    nodejs: {
        canonical: "Node.js",
        synonyms: ["node.js", "nodejs", "node js", "node"],
        strictBoundary: true,
    },
    nextjs: {
        canonical: "Next.js",
        synonyms: ["next.js", "nextjs", "next js"],
        strictBoundary: true,
    },
    golang: {
        canonical: "Go",
        synonyms: ["golang", "go language", "go programming"],
        strictBoundary: true,
    },
    python: {
        canonical: "Python",
        synonyms: ["python", "python3"],
        strictBoundary: true,
    },
    c: {
        canonical: "C",
        synonyms: ["c programming", "c language"],
        strictBoundary: true,
    },
    cpp: {
        canonical: "C++",
        synonyms: ["c++", "cpp"],
        strictBoundary: true,
    },
    csharp: {
        canonical: "C#",
        synonyms: ["c#", "csharp", "c-sharp"],
        strictBoundary: true,
    },
    rust: {
        canonical: "Rust",
        synonyms: ["rust", "rustlang"],
        negativeLookahead: ["ing", "ed", "y", "ic"],
        strictBoundary: true,
    },
    sql: {
        canonical: "SQL",
        synonyms: ["sql", "structured query language"],
        strictBoundary: true,
    },
    postgresql: {
        canonical: "PostgreSQL",
        synonyms: ["postgresql", "postgres"],
        strictBoundary: true,
    },
    powerbi: {
        canonical: "Power BI",
        synonyms: ["power bi", "powerbi"],
        strictBoundary: true,
    },
    tableau: {
        canonical: "Tableau",
        synonyms: ["tableau"],
        strictBoundary: true,
    },
    excel: {
        canonical: "Excel",
        synonyms: ["excel", "advanced excel", "ms excel", "microsoft excel"],
        strictBoundary: true,
    },
    tally: {
        canonical: "Tally",
        synonyms: ["tally", "tally prime", "tally erp", "tally erp 9", "tallyerp"],
        strictBoundary: true,
    },
    gst: {
        canonical: "GST",
        synonyms: ["gst", "goods and services tax"],
        strictBoundary: true,
    },
    autocad: {
        canonical: "AutoCAD",
        synonyms: ["autocad", "auto cad"],
        strictBoundary: true,
    },
    cad: {
        canonical: "CAD",
        synonyms: ["cad", "computer aided design", "cad design"],
        strictBoundary: true,
    },
    solidworks: {
        canonical: "SolidWorks",
        synonyms: ["solidworks", "solid works"],
        strictBoundary: true,
    },
    staad: {
        canonical: "STAAD.Pro",
        synonyms: ["staad", "staad pro", "staad.pro", "staad-pro"],
        strictBoundary: true,
    },
    kubernetes: {
        canonical: "Kubernetes",
        synonyms: ["kubernetes", "k8s"],
        strictBoundary: true,
    },
    machinelearning: {
        canonical: "Machine Learning",
        synonyms: ["machine learning", "ml"],
        strictBoundary: true,
    },
};

/**
 * Escapes regex special characters.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks whether a given skill token matches safely inside the text.
 * Avoids false substring matches (e.g. "Java" in "JavaScript" or "React" in "reactive").
 */
export function matchesSkillToken(text: string, skill: string): boolean {
    if (!text || !skill) return false;
    const cleanSkill = skill.trim().toLowerCase();
    const cleanText = text.toLowerCase();

    // Check specific known mappings
    if (cleanSkill === "java") {
        // Must match "java" but NOT "javascript"
        const javaRegex = /(?:^|[^a-zA-Z0-9+#.-])java(?![a-zA-Z0-9+#.-]|script)(?:[^a-zA-Z0-9+#.-]|$)/i;
        return javaRegex.test(cleanText);
    }

    if (cleanSkill === "javascript" || cleanSkill === "js") {
        const jsRegex = /(?:^|[^a-zA-Z0-9+#.-])(?:javascript|js|ecmascript)(?:[^a-zA-Z0-9+#.-]|$)/i;
        return jsRegex.test(cleanText);
    }

    if (cleanSkill === "react" || cleanSkill === "reactjs" || cleanSkill === "react.js") {
        // Matches react or reactjs or react.js, but NOT reactive, reaction, reactor
        const reactRegex = /(?:^|[^a-zA-Z0-9+#.-])(?:react(?:\.js|js)?)(?![a-zA-Z0-9+#.-]|ive|ion|or)(?:[^a-zA-Z0-9+#.-]|$)/i;
        return reactRegex.test(cleanText);
    }

    if (cleanSkill === "go" || cleanSkill === "golang") {
        // Match "golang" anywhere as token, or "go" when qualified as language/programming/tech
        if (/(?:^|[^a-zA-Z0-9+#.-])golang(?:[^a-zA-Z0-9+#.-]|$)/i.test(cleanText)) return true;
        if (/(?:^|[^a-zA-Z0-9+#.-])go\s+(?:programming|language|developer|engineer|backend|code)(?:[^a-zA-Z0-9+#.-]|$)/i.test(cleanText)) return true;
        if (/(?:^|[^a-zA-Z0-9+#.-])(?:language|using|with)\s+go(?:[^a-zA-Z0-9+#.-]|$)/i.test(cleanText)) return true;
        return false;
    }

    if (cleanSkill === "c") {
        // C language: avoid matching any single letter c unless qualified or standalone in skill lists
        if (/(?:^|[^a-zA-Z0-9+#.-])c\s+(?:programming|language|developer|code)(?:[^a-zA-Z0-9+#.-]|$)/i.test(cleanText)) return true;
        if (/(?:skills?|languages?)[:\s][^\n\r]*\bc\b/i.test(cleanText)) return true;
        return false;
    }

    if (cleanSkill === "c++" || cleanSkill === "cpp") {
        const cppRegex = /(?:^|[^a-zA-Z0-9])(?:c\+\+|cpp)(?:[^a-zA-Z0-9]|$)/i;
        return cppRegex.test(cleanText);
    }

    if (cleanSkill === "c#" || cleanSkill === "csharp") {
        const csRegex = /(?:^|[^a-zA-Z0-9])(?:c#|csharp|c-sharp)(?:[^a-zA-Z0-9]|$)/i;
        return csRegex.test(cleanText);
    }

    if (cleanSkill === "sql") {
        // Match SQL standalone, not MySQL or PostgreSQL
        const sqlRegex = /(?:^|[^a-zA-Z0-9+#.-])sql(?![a-zA-Z0-9+#.-])(?:[^a-zA-Z0-9+#.-]|$)/i;
        return sqlRegex.test(cleanText);
    }

    if (cleanSkill === "power bi" || cleanSkill === "powerbi") {
        const pbiRegex = /(?:^|[^a-zA-Z0-9+#.-])power\s*bi(?:[^a-zA-Z0-9+#.-]|$)/i;
        return pbiRegex.test(cleanText);
    }

    if (cleanSkill === "staad" || cleanSkill === "staad pro" || cleanSkill === "staad.pro") {
        const staadRegex = /(?:^|[^a-zA-Z0-9+#.-])staad(?:\.?\s*pro)?(?:[^a-zA-Z0-9+#.-]|$)/i;
        return staadRegex.test(cleanText);
    }

    if (cleanSkill === "tally" || cleanSkill === "tally prime" || cleanSkill === "tally erp") {
        const tallyRegex = /(?:^|[^a-zA-Z0-9+#.-])tally(?:\s*(?:prime|erp(?:\s*9)?))?(?:[^a-zA-Z0-9+#.-]|$)/i;
        return tallyRegex.test(cleanText);
    }

    if (cleanSkill === "excel" || cleanSkill === "advanced excel") {
        const excelRegex = /(?:^|[^a-zA-Z0-9+#.-])(?:advanced\s+)?excel(?:[^a-zA-Z0-9+#.-]|$)/i;
        return excelRegex.test(cleanText);
    }

    if (cleanSkill === "gst") {
        const gstRegex = /(?:^|[^a-zA-Z0-9+#.-])gst(?:[^a-zA-Z0-9+#.-]|$)/i;
        return gstRegex.test(cleanText);
    }

    if (cleanSkill === "autocad" || cleanSkill === "cad") {
        if (cleanSkill === "autocad") {
            return /(?:^|[^a-zA-Z0-9+#.-])auto\s*cad(?:[^a-zA-Z0-9+#.-]|$)/i.test(cleanText);
        }
        return /(?:^|[^a-zA-Z0-9+#.-])(?:autocad|cad)(?:[^a-zA-Z0-9+#.-]|$)/i.test(cleanText);
    }

    // Generic safe boundary matching
    const escaped = escapeRegex(cleanSkill);
    const genericRegex = new RegExp(`(?:^|[^a-zA-Z0-9+#.-])${escaped}(?:[^a-zA-Z0-9+#.-]|$)`, "i");
    return genericRegex.test(cleanText);
}

/**
 * Normalizes a skill string into its controlled canonical form.
 */
export function normalizeSkillToken(rawSkill: string): string {
    const s = rawSkill.trim();
    const lower = s.toLowerCase().replace(/[-_.]+/g, " ").trim();

    if (lower === "js" || lower === "javascript") return "JavaScript";
    if (lower === "java") return "Java";
    if (lower === "react" || lower === "reactjs" || lower === "react js") return "React";
    if (lower === "node" || lower === "nodejs" || lower === "node js") return "Node.js";
    if (lower === "nextjs" || lower === "next js" || lower === "next") return "Next.js";
    if (lower === "golang" || lower === "go") return "Go";
    if (lower === "postgres" || lower === "postgresql") return "PostgreSQL";
    if (lower === "powerbi" || lower === "power bi") return "Power BI";
    if (lower === "autocad" || lower === "auto cad") return "AutoCAD";
    if (lower === "staad" || lower === "staad pro" || lower === "staad.pro") return "STAAD.Pro";
    if (lower.startsWith("tally")) return "Tally";
    if (lower === "gst") return "GST";
    if (lower === "excel" || lower === "advanced excel") return "Excel";
    if (lower === "ml" || lower === "machine learning") return "Machine Learning";
    if (lower === "k8s" || lower === "kubernetes") return "Kubernetes";
    if (lower === "ui/ux" || lower === "ui ux") return "UI/UX";

    return s.length <= 4 && !/[aeiou]/i.test(s) ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1);
}
