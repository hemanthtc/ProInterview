/**
 * Utilities for cleaning, formatting, and visually aligning job descriptions
 * into an executive, highly structured Markdown layout:
 *
 * # **[Job Title]**
 * **Company:** [Company Name]
 * **Location:** [Location]
 *
 * ---
 *
 * ### **Role & Team Overview**
 * ...
 *
 * ---
 *
 * ### **Key Responsibilities**
 * * **[Category]:** [Duty detail]
 *
 * ---
 *
 * ### **Basic / Minimum Qualifications**
 * * **Experience & Mindset:**
 *   * [Item]
 * * **Technical Skills:**
 *   * [Item]
 *
 * ---
 *
 * ### **Preferred Qualifications**
 * ...
 *
 * ---
 *
 * ### **About Company (Brief)**
 * ...
 */

/**
 * Decodes HTML entities iteratively up to 3 passes.
 */
export function decodeHtmlEntities(str: string): string {
    if (!str) return "";
    let prev = "";
    let curr = str;
    let rounds = 0;
    while (prev !== curr && rounds < 3) {
        prev = curr;
        rounds++;
        curr = curr
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/&apos;/gi, "'")
            .replace(/&nbsp;/gi, " ")
            .replace(/\\u003c/gi, "<")
            .replace(/\\u003e/gi, ">")
            .replace(/\\u0026/gi, "&")
            .replace(/&#(\d+);/g, (_, dec) => {
                try {
                    return String.fromCharCode(parseInt(dec, 10));
                } catch {
                    return "";
                }
            })
            .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
                try {
                    return String.fromCharCode(parseInt(hex, 16));
                } catch {
                    return "";
                }
            });
    }
    return curr;
}

/**
 * Known tech terms that should retain their CamelCase capitalization
 * when un-squashing text.
 */
const KNOWN_TECH_WORDS = new Set([
    "javascript",
    "typescript",
    "postgresql",
    "mongodb",
    "graphql",
    "nextjs",
    "nuxtjs",
    "nodejs",
    "openai",
    "chatgpt",
    "devops",
    "nosql",
    "bigquery",
    "fastapi",
    "deepmind",
    "airflow",
    "bitbucket",
    "gitlab",
    "github",
    "jobfound",
]);

/**
 * Un-squashes text where words or punctuation have been accidentally glued together
 * (e.g. "Mumbai.What", "roleForward", "doLead", "metricsDesign", "systems)Ship").
 */
export function unSquashText(input: string): string {
    if (!input) return "";

    let text = input;

    // 1. Separate punctuation directly touching letters (e.g. "Mumbai.What" -> "Mumbai. What", "systems)Ship" -> "systems) Ship")
    text = text.replace(/([.!?:;)])([A-Za-z])/g, "$1 $2");

    // 2. Separate lowercase letters touching uppercase letters, unless the whole word is a known tech word
    text = text.replace(/\b[A-Za-z0-9_]+\b/g, (word) => {
        if (KNOWN_TECH_WORDS.has(word.toLowerCase())) {
            return word;
        }
        return word.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    });

    // 3. Fix glued arrow symbols (e.g. "incident→fix" -> "incident → fix")
    text = text.replace(/([A-Za-z0-9])([→←↔])([A-Za-z0-9])/g, "$1 $2 $3");

    // 4. Ensure known tech words are not mangled (e.g. "Type Script" -> "TypeScript", "Java Script" -> "JavaScript")
    text = text.replace(/\bType\s+Script\b/gi, "TypeScript");
    text = text.replace(/\bJava\s+Script\b/gi, "JavaScript");
    text = text.replace(/\bNext\s+Js\b/gi, "Next.js");
    text = text.replace(/\bNode\s+Js\b/gi, "Node.js");

    return text;
}

/**
 * Strips raw HTML and extracts clean text while converting structural elements
 * into clean line breaks and bullet markers.
 */
export function htmlToCleanText(html: string): string {
    if (!html) return "";

    let text = html
        // Remove scripts, styles, iframes, svgs, noscripts, navs, headers, footers
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

    // Decode HTML entities so escaped tags like &lt;p&gt; or &lt;li&gt; become real tags
    text = decodeHtmlEntities(text);

    // Convert structural tags (both opening and closing) into line breaks
    text = text
        .replace(/<\/(h[1-6])>/gi, "\n\n")
        .replace(/<(h[1-6])[^>]*>/gi, "\n\n### ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|section|article|tr|blockquote)>/gi, "\n\n")
        .replace(/<(p|div|section|article|tr|blockquote)[^>]*>/gi, "\n\n")
        .replace(/<li[^>]*>/gi, "\n* ")
        .replace(/<\/li>/gi, "\n")
        .replace(/<dt[^>]*>/gi, "\n\n")
        .replace(/<dd[^>]*>/gi, "\n* ")
        .replace(/<[^>]+>/g, " ");

    // Decode again for any remaining text entities
    text = decodeHtmlEntities(text);

    return unSquashText(text)
        .split("\n")
        .map((l) => l.replace(/[ \t]+/g, " ").trim())
        .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
        .join("\n")
        .trim();
}

/**
 * Standard section header definitions.
 * Preferred Qualifications is ordered before Basic Qualifications
 * so that generic "Qualifications" does not shadow "Preferred Qualifications".
 */
interface SectionDefinition {
    title: string;
    regex: RegExp;
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
    {
        title: "Role & Team Overview",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:About (?:the|this)? (?:Role|Position|Job|Team|Company|Us)|Role & Team Overview|Role Overview|Job Overview|Position Overview|Position Summary|Job Summary|The Opportunity|Who We Are)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
    {
        title: "Key Responsibilities",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:Key Responsibilities|Core Responsibilities|Primary Responsibilities|Responsibilities|What You(?:[''’`]ll| will) Do|What You(?:[''’`]ll| will) Be Doing|Core Duties|Day to Day|Your Impact|In This Role|Job Responsibilities|Role Responsibilities|Duties & Responsibilities)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
    {
        title: "Preferred Qualifications",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:Preferred Qualifications|Desired Qualifications|Preferred Skills|Bonus Points|Bonus|Nice to Have|Good to Have|Additional Qualifications|Preferred Experience|Bonus Skills|Plus Points)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
    {
        title: "Basic / Minimum Qualifications",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:Basic \/ Minimum Qualifications|Basic Qualifications|Minimum Qualifications|Required Qualifications(?: & Skills)?|Qualifications & Skills|Required Skills|Minimum Requirements|Job Requirements|(?<!Preferred\s+|Desired\s+|Additional\s+)Qualifications|Requirements|You (?:may|might|could|will) be a (?:good |great )?fit if|What We(?:[''’`]re| are) Looking For|What You(?:[''’`]ll| will) Bring|What You Bring|Who You Are|Skills & Experience|Key Requirements|Experience & Skills|Candidate Profile)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
    {
        title: "Tech Stack & Core Technologies",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:Tech Stack & Core Technologies|Tech Stack(?: & Tools)?|Technology Stack|Tools & Technologies|Technologies Used|Core Technologies|Technical Stack|Tools & Systems)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
    {
        title: "Benefits & Compensation",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:Benefits & Compensation|Benefits & Perks|Perks & Benefits|What We Offer|Compensation & Benefits|Why Join Us|Perks|Benefits|Compensation|Salary & Benefits)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
    {
        title: "About Company (Brief)",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:About Company \(Brief\)|About Company|About Cursor|Company Overview|Company Description)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
    {
        title: "Job Details",
        regex: /(?<=^|[.\n\s])(?:###\s*)?(?:\*\*)?(?:Job Details|Employment Type|Work Arrangement|Location & Work Model|Workplace Type|About The Team)(?:\*\*)?(?::|\s*\n|\s+)/gi,
    },
];

/**
 * Splits responsibilities text into individual duty items,
 * handling both squashed single-line action verbs and multiline blocks.
 */
function splitResponsibilities(lines: string[]): string[] {
    const rawJoined = lines.join("\n");
    // Connect continuation bullet lines (e.g. "* going deep in code..." following "Work directly with...")
    const normalized = rawJoined
        .replace(/\n\s*[•\*\-▪▫–—]\s*(?=[a-z]|going|if\s+it|while|including|such\s+as)/g, ", ")
        .replace(/\n\s+/g, "\n");

    const splitByLine = normalized
        .split("\n")
        .map((l) => l.replace(/^(?:\s*[•\*\-▪▫–—]|\d+[\.\)]|\([a-z0-9]\))\s*/i, "").trim())
        .filter(Boolean);

    const results: string[] = [];

    for (const chunk of splitByLine) {
        // Discard any broken bullet fragments (e.g. "**Workflow")
        if (/^\*\*[A-Za-z\s]+$/.test(chunk) || chunk.length < 10) {
            continue;
        }

        // If this chunk already starts with an explicit category label (with or without **),
        // keep it intact as a single item and don't split on verbs inside the label.
        if (/^(?:\*\*)?[A-Za-z0-9\s/&,–—\(\)\+]+?(?::\*\*|\*\*:|:)\s+/.test(chunk)) {
            results.push(chunk);
            continue;
        }

        // Split on action verbs preceded by normal words, punctuation, or parenthesis
        const verbSplit = chunk.split(
            /(?<=[a-z0-9\).!?,;])\s+(?=(?:Lead|Design|Ship|Own|Work|Turn|Build|Partner|Drive|Scale|Collaborate|Develop|Implement|Architect|Manage|Create|Deliver|Identify|Guide|Execute|Optimize|Analyze)\b)/
        );
        for (const item of verbSplit) {
            const trimmed = item.trim();
            if (trimmed.length > 10 && !/^\*\*[A-Za-z\s]+$/.test(trimmed)) {
                results.push(trimmed);
            }
        }
    }

    return results.length > 0 ? results : lines;
}

/**
 * Categorizes responsibilities into high-impact bold categories
 * matching executive resume and job description standards.
 */
function inferResponsibilityCategory(dutyText: string): string | null {
    if (/(?:lead\s+)?discovery|bottleneck|scoping|requirements\s+gathering/i.test(dutyText)) {
        return "Discovery & Scoping";
    }
    if (/(?:design|build)\s+.*(?:workflow|system|pipeline|architect|solution)/i.test(dutyText)) {
        return "Workflow Design & Development";
    }
    if (/ship\s+a\s+fast|rapid\s+prototyp|fast\s+first\s+version|rollout\s+plans/i.test(dutyText)) {
        return "Rapid Prototyping & Iteration";
    }
    if (/production\s+quality|observability|tracing|evals|debugging\s+model|latency|reliability/i.test(dutyText)) {
        return "Production Quality & Observability";
    }
    if (/work\s+directly\s+with\s+(?:staff|executives|leaders|teams)|leadership|stakeholder/i.test(dutyText)) {
        return "Leadership & Collaboration";
    }
    if (/reusable\s+patterns|push\s+improvements|core\s+(?:cursor\s+)?product|feedback\s+loop/i.test(dutyText)) {
        return "Product Feedback Loop";
    }
    if (/cloud|infrastructure|devops|ci\/cd|kubernetes|terraform/i.test(dutyText)) {
        return "Cloud & Infrastructure";
    }
    return null;
}

/**
 * Normalizes, cleans, and categorizes a single responsibility item,
 * removing duplicate labels, fixing stray fragments, and ensuring consistent bolding.
 */
function cleanResponsibilityItem(item: string): string | null {
    // Strip leading bullet marker (*, -, •, etc.) ONLY when followed by whitespace,
    // so that markdown bold asterisks (**) are never stripped or mangled.
    let text = item.replace(/^\s*(?:[•\-▪▫–—]|\*(?=\s))\s*/, "").trim();
    if (!text) return null;

    // Discard stray broken fragments (e.g. "**Workflow", "**Role", etc.)
    if (/^\*\*[A-Za-z\s]+$/.test(text) || text.length < 10) {
        return null;
    }

    // Clean duplicate bold labels, e.g.:
    // "**Workflow Design & Development:** Design & Development:** ..."
    // or "**Workflow Design & Development:** Workflow Design & Development: ..."
    text = text.replace(
        /^(?:\*\*)?([A-Za-z0-9\s/&,–—\(\)\+]+?)(?::\*\*|\*\*:|:)\s+(?:(?:\*\*)?(?:\1|Design & Development|Responsibilities)(?::\*\*|\*\*:|:)\s+)+/i,
        "**$1:** "
    );

    // If it has "Own production quality: ...", map to "Production Quality & Observability: Own production quality: ..."
    if (/^(?:\*\*)?Own production quality(?::\*\*|\*\*:|:)\s*(.*)$/i.test(text)) {
        const rest = text.replace(/^(?:\*\*)?Own production quality(?::\*\*|\*\*:|:)\s*/i, "").trim();
        return `* **Production Quality & Observability:** Own production quality: ${rest}`;
    }

    // If already properly bolded: "* **Label:** Details" or "**Label:** Details"
    const boldMatch = text.match(/^(?:\*\*)?([A-Za-z0-9\s/&,–—\(\)\+]+?)(?::\*\*|\*\*:|:)\s+(.*)$/);
    if (boldMatch) {
        const label = boldMatch[1].replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
        const details = boldMatch[2].replace(/^(?:\*\*)?(?:Design & Development|Responsibilities)(?::\*\*|\*\*:|:)\s*/i, "").trim();
        return `* **${label}:** ${details}`;
    }

    // Otherwise infer category
    const inferred = inferResponsibilityCategory(text);
    if (inferred) {
        return `* **${inferred}:** ${text}`;
    }

    return formatBulletLine(text);
}

/**
 * Splits qualifications text into individual requirement items,
 * handling clauses like "You thrive...", "You build...", "You're strong in...", etc.
 */
function splitQualifications(lines: string[]): string[] {
    const rawJoined = lines.join("\n");
    // Connect continuation bullet lines (e.g. "* if it needs frontend..." following "You build end-to-end")
    const normalized = rawJoined
        .replace(/\n\s*[•\*\-▪▫–—]\s*(?=[a-z]|if\s+it|while|including|such\s+as)/g, ": ")
        .replace(/\n\s+/g, "\n");

    const splitByLine = normalized
        .split("\n")
        .map((l) => l.replace(/^\s*(?:[•\-▪▫–—]|\*(?=\s)|\d+[\.\)]|\([a-z0-9]\))\s*/i, "").trim())
        .filter(Boolean);

    const results: string[] = [];

    for (const chunk of splitByLine) {
        // Discard subsection headings so they are not bulletized
        if (/^(?:\*\*)?(?:Experience\s*&?\s*Mindset|Technical\s*Skills|Required\s*Skills|Qualifications|Requirements)(?::\*\*|\*\*:|:|\*\*)?$/i.test(chunk)) {
            continue;
        }

        // If this chunk already starts with an explicit category label (e.g. "Technical Skills: ..."),
        // keep it intact as a single item
        if (/^(?:\*\*)?[A-Za-z0-9\s/&,–—\(\)\+]+?(?::\*\*|\*\*:|:)\s+/.test(chunk)) {
            results.push(chunk);
            continue;
        }

        const qualSplit = chunk.split(
            /(?<=[a-z0-9\).!?,;])\s+(?=(?:You(?:[''’`]ve|[''’`]re| build| thrive| have| are| ramp)|Ability to|Experience (?:with|in|building)|Strong (?:expertise|proficiency|background|knowledge)|Deep (?:understanding|knowledge)|Proficiency in|Hands-on|Track record|Bachelor|Master|Degree)\b)|(?<=[.!?])\s+(?=[A-Z0-9])/
        );
        for (const item of qualSplit) {
            const trimmed = item.trim();
            if (trimmed.length > 5 && !/^(?:\*\*)?(?:Experience\s*&?\s*Mindset|Technical\s*Skills)(?::\*\*|\*\*:|:|\*\*)?$/i.test(trimmed)) {
                results.push(trimmed);
            }
        }
    }

    return results.length > 0 ? results : lines;
}

/**
 * Formats a single bullet point item, bolding any category label preceding a colon.
 * e.g. "Discovery & Scoping: Lead discovery sessions..." -> "* **Discovery & Scoping:** Lead discovery sessions..."
 */
function formatBulletLine(content: string, indent: string = ""): string {
    const trimmed = content.trim();
    if (!trimmed) return "";

    // Already bolded label e.g. "**Label:** rest"
    if (/^\*\*[^*]+?\*\*:\s*/.test(trimmed)) {
        return `${indent}* ${trimmed}`;
    }

    // Category label candidate e.g. "Category Name: Details..."
    const labelMatch = trimmed.match(/^([A-Za-z0-9\s/&,–—\(\)\+]+?):\s+(.*)$/);
    if (labelMatch) {
        const potentialLabel = labelMatch[1].trim();
        const words = potentialLabel.split(/\s+/);
        // Only bold if label is a concise category/topic (1 to 6 words)
        if (words.length <= 6 && !potentialLabel.includes(".") && !potentialLabel.includes("!")) {
            return `${indent}* **${potentialLabel}:** ${labelMatch[2].trim()}`;
        }
    }

    return `${indent}* ${trimmed}`;
}

/**
 * Formats and aligns any raw job description into the executive Markdown layout:
 *
 * # **[Job Title]**
 * **Company:** [Company Name]
 * **Location:** [Location]
 *
 * ---
 *
 * ### **Role & Team Overview**
 * ...
 *
 * ---
 *
 * ### **Key Responsibilities**
 * * **[Category]:** [Details]
 *
 * ---
 *
 * ### **Basic / Minimum Qualifications**
 * * **Experience & Mindset:**
 *   * [Details]
 * * **Technical Skills:**
 *   * [Details]
 *
 * ---
 *
 * ### **Preferred Qualifications**
 * ...
 *
 * ---
 *
 * ### **About Company (Brief)**
 * ...
 */
export function formatAndAlignJobDescription(
    raw: string,
    role?: string,
    company?: string,
    location?: string
): string {
    if (!raw || !raw.trim()) return "";

    // 1. Unescape literal \n or \r\n characters if present in string literals
    let text = raw.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

    // 2. Decode entities and strip any stray HTML tags
    if (/<[a-z][\s\S]*>/i.test(text) || /&(?:amp|lt|gt|quot|#\d+|#x[a-f0-9]+);/i.test(text)) {
        text = htmlToCleanText(text);
    } else {
        text = decodeHtmlEntities(text);
        text = unSquashText(text);
    }

    // 3. Remove any trailing prompt instructions if user pasted instructions with the text
    text = text.replace(
        /\s*(?:after\s+update\s+jd\s+alignment|please\s+format|format\s+like\s+this|align\s+like\s+this|from\s+the\s+jd\s+what\s+u\s+noticed|from\s+the\s+jd\s+what\s+you\s+noticed)[\s\S]*$/i,
        ""
    );

    // 4. Extract Role, Company, Location from raw text if missing
    let detectedRole = role || "";
    let detectedCompany = company || "";
    let detectedLocation = location || "";

    const roleMatch = text.match(/(?:^|\n)(?:#\s*\*\*?|Role:\s*)([^\n*]+?)(?:\*\*|\n|$)/i);
    if (roleMatch && !detectedRole) {
        detectedRole = roleMatch[1].replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
    }

    const companyMatch = text.match(/(?:^|\n)(?:[•\*\-▪▫–—]\s*)*\*?\*?Company:\*?\*?\s*([^\n]+)/i);
    if (companyMatch && !detectedCompany) {
        detectedCompany = companyMatch[1].replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
    }

    const locationMatch = text.match(/(?:^|\n)(?:[•\*\-▪▫–—]\s*)*\*?\*?Location:\*?\*?\s*([^\n]+)/i);
    if (locationMatch && !detectedLocation) {
        detectedLocation = locationMatch[1].replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
    }

    // Strip top header lines from text so they don't get duplicated or bulletized
    text = text
        .replace(/(?:^|\n)#\s*\*\*?[^\n]+?\*\*?(?=\n|$)/gi, "")
        .replace(/(?:^|\n)(?:[•\*\-▪▫–—]\s*)*\*?\*?Company:\*?\*?[^\n]*(?=\n|$)/gi, "")
        .replace(/(?:^|\n)(?:[•\*\-▪▫–—]\s*)*\*?\*?Location:\*?\*?[^\n]*(?=\n|$)/gi, "")
        .trim();

    // 5. Promote recognized section headers to standard markdown headings
    for (const def of SECTION_DEFINITIONS) {
        text = text.replace(def.regex, `\n\n### **${def.title}**\n\n`);
    }

    // 6. Split inline bullet points squashed on single lines
    text = text.replace(/([^\n])\s+[•\*\-▪▫–—]\s+/g, "$1\n* ");
    text = text.replace(/([^\n])\s+(?:\d+[\.\)]|\([a-z0-9]\))\s+/gi, "$1\n* ");

    // 7. Process sections line-by-line
    const rawLines = text.split("\n");
    const formattedSections: Array<{ heading?: string; lines: string[] }> = [];
    let currentHeading: string | undefined;
    let currentLines: string[] = [];

    const flushCurrentSection = () => {
        if (currentLines.length === 0 && !currentHeading) return;

        const isResponsibilities = currentHeading && currentHeading.includes("Key Responsibilities");
        const isBasicQualifications = currentHeading && currentHeading.includes("Basic / Minimum Qualifications");
        const isPreferredQualifications = currentHeading && currentHeading.includes("Preferred Qualifications");
        const isQualifications = isBasicQualifications || isPreferredQualifications || (currentHeading && currentHeading.includes("Qualifications"));
        const isListSection = isResponsibilities || isQualifications || (currentHeading && (currentHeading.includes("Tech Stack") || currentHeading.includes("Benefits")));

        const processedLines: string[] = [];

        if (isResponsibilities) {
            const dutyItems = splitResponsibilities(currentLines);
            for (const item of dutyItems) {
                const cleaned = cleanResponsibilityItem(item);
                if (cleaned) {
                    processedLines.push(cleaned);
                }
            }
        } else if (isBasicQualifications) {
            // Check if current lines already contain subsection headers or indented sub-bullets
            const hasSubsections = currentLines.some((l) =>
                /(?:Experience\s*&?\s*Mindset|Technical\s*Skills)/i.test(l)
            );

            const expItems: string[] = [];
            const techItems: string[] = [];
            const generalItems: string[] = [];

            if (hasSubsections) {
                let currentSubgroup: "exp" | "tech" | null = null;
                for (const rawLine of currentLines) {
                    const trimmed = rawLine.trim();
                    if (!trimmed) continue;

                    if (/^(?:\*\s*)?(?:\*\*)?Experience\s*&?\s*Mindset(?::\*\*|\*\*:|:|\*\*)?$/i.test(trimmed)) {
                        currentSubgroup = "exp";
                        continue;
                    }
                    if (/^(?:\*\s*)?(?:\*\*)?Technical\s*Skills(?::\*\*|\*\*:|:|\*\*)?$/i.test(trimmed)) {
                        currentSubgroup = "tech";
                        continue;
                    }

                    const cleanItem = trimmed
                        .replace(/^\s*(?:[•\-▪▫–—]|\*(?=\s)|\d+[\.\)]|\([a-z0-9]\))\s*/i, "")
                        .replace(/^\s*(?:[•\-▪▫–—]|\*\s+)+/, "")
                        .trim();

                    if (!cleanItem || cleanItem.length < 5) continue;

                    // Filter out any leaked repeated headings
                    if (/^(?:\*\*)?(?:Experience\s*&?\s*Mindset|Technical\s*Skills|Required\s*Skills|Qualifications|Requirements)(?::\*\*|\*\*:|:|\*\*)?$/i.test(cleanItem)) {
                        continue;
                    }

                    if (currentSubgroup === "tech") {
                        techItems.push(cleanItem);
                    } else if (currentSubgroup === "exp") {
                        expItems.push(cleanItem);
                    } else {
                        if (
                            /python|typescript|javascript|react|node|golang|java|c\+\+|aws|docker|kubernetes|sql|stack|tools|languages/i.test(
                                cleanItem
                            )
                        ) {
                            techItems.push(cleanItem);
                        } else {
                            expItems.push(cleanItem);
                        }
                    }
                }
            } else {
                const qualItems = splitQualifications(currentLines);
                for (const item of qualItems) {
                    const cleanItem = item.replace(/^[•\*\-▪▫–—\s]+/, "").trim();
                    if (!cleanItem || cleanItem.length < 5) continue;
                    if (/^(?:\*\*)?(?:Experience\s*&?\s*Mindset|Technical\s*Skills|Required\s*Skills|Qualifications|Requirements)(?::\*\*|\*\*:|:|\*\*)?$/i.test(cleanItem)) {
                        continue;
                    }
                    if (
                        /python|typescript|javascript|react|node|golang|java|c\+\+|aws|docker|kubernetes|sql|stack|tools|languages/i.test(
                            cleanItem
                        )
                    ) {
                        techItems.push(cleanItem);
                    } else {
                        expItems.push(cleanItem);
                    }
                }
            }

            if (expItems.length > 0 && techItems.length > 0) {
                processedLines.push("* **Experience & Mindset:**");
                for (const it of expItems) {
                    processedLines.push(`  * ${it}`);
                }
                processedLines.push("* **Technical Skills:**");
                for (const it of techItems) {
                    processedLines.push(`  * ${it}`);
                }
            } else {
                for (const it of [...expItems, ...techItems, ...generalItems]) {
                    processedLines.push(formatBulletLine(it));
                }
            }
        } else if (isListSection) {
            for (const line of currentLines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const items = trimmed.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
                for (const it of items) {
                    processedLines.push(formatBulletLine(it.replace(/^[•\*\-▪▫–—\d\.\)\s]+/, "")));
                }
            }
        } else {
            // Narrative section (e.g. Role & Team Overview, About Company)
            const combined = currentLines.join(" ").trim();
            if (combined) {
                processedLines.push(combined);
            }
        }

        formattedSections.push({ heading: currentHeading, lines: processedLines });
        currentLines = [];
        currentHeading = undefined;
    };

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
            flushCurrentSection();
            const cleanTitle = trimmed.replace(/^###\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
            currentHeading = `### **${cleanTitle}**`;
            continue;
        }

        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
            continue;
        }

        if (!trimmed) {
            continue;
        }

        currentLines.push(line);
    }
    flushCurrentSection();

    // 8. Assemble the output with canonical headers and dividers (---)
    const outputBlocks: string[] = [];

    // Header block
    const cleanRole = detectedRole.replace(/^Role:\s*/i, "").replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
    const cleanCompany = detectedCompany.replace(/^Company:\s*/i, "").replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
    const cleanLocation = detectedLocation.replace(/^Location:\s*/i, "").replace(/^\*\*/, "").replace(/\*\*$/, "").trim();

    if (cleanRole || cleanCompany) {
        let headerText = "";
        if (cleanRole) {
            headerText += `# **${cleanRole}**\n`;
        }
        if (cleanCompany) {
            headerText += `**Company:** ${cleanCompany}\n`;
        }
        if (cleanLocation) {
            headerText += `**Location:** ${cleanLocation}\n`;
        }
        if (headerText) {
            outputBlocks.push(headerText.trim());
        }
    }

    // Build sections with dividers
    for (let s = 0; s < formattedSections.length; s++) {
        const sec = formattedSections[s];
        const sectionContent = sec.lines.join("\n").trim();

        if (!sec.heading && !sectionContent) continue;

        // If the section content is just repeating the role or company, skip
        if (
            !sec.heading &&
            (sectionContent.toLowerCase() === cleanRole.toLowerCase() ||
                sectionContent.toLowerCase() === cleanCompany.toLowerCase())
        ) {
            continue;
        }

        const secBlockParts: string[] = [];
        if (sec.heading) {
            secBlockParts.push(sec.heading);
        }
        if (sectionContent) {
            secBlockParts.push(sectionContent);
        }

        const secBlock = secBlockParts.join("\n\n").trim();
        if (secBlock) {
            outputBlocks.push(secBlock);
        }
    }

    // Join with horizontal rules between sections
    let finalResult = outputBlocks.join("\n\n---\n\n");

    // Clean up any double dividers or redundant blank lines
    finalResult = finalResult
        .replace(/(?:---\s*){2,}/g, "---\n\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return finalResult;
}
