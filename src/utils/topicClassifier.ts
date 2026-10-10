/**
 * Topic and Domain Classifier for Synthetic Data Studio & Roadmaps.
 *
 * Implements strict topic fidelity:
 * Default to non-technical unless the topic explicitly names programming
 * languages, software, tools, or systems.
 */

// Software, programming languages, development tools, and computer systems
const TECHNICAL_PATTERN = /\b(sql|mysql|postgresql|sqlite|mongodb|redis|cassandra|database|query|queries|python|javascript|typescript|java|c\+\+|c#|\.net|golang|rust|ruby|php|swift|kotlin|scala|perl|r\b|matlab|react|angular|vue|nextjs|next\.js|node|nodejs|express|django|flask|spring\s*boot|docker|kubernetes|k8s|git|github|gitlab|ci\/cd|devops|aws|azure|gcp|cloud|linux|unix|bash|shell|powershell|kernel|ipc|posix|api|rest|graphql|grpc|microservices?|html|css|tailwind|compiler|data\s*structures?|algorithms?|cryptography|tcp\/ip|udp|http|websocket|system\s*design|object\s*oriented|concurrency|multithreading|asynchronous|machine\s*learning|deep\s*learning|neural\s*network|nlp|llm|pytorch|tensorflow|scikit)\b/i;

// Factual domains that mandate web grounding per Rule 1
const FACTUAL_DOMAIN_PATTERN = /\b(history|historical|dynasty|empire|war|battle|treaty|monarchy|constitution|law|legal|court|statute|regulation|rights|jurisdiction|medicine|medical|health|clinical|pathology|anatomy|disease|pharma|biology|biological|physics|chemistry|astronomy|geology|finance|financial|economics|economic|stock|inflation|banking|budget|politics|political|government|election|parliament|current\s*events?|geography|literature|philosophy|author|novel|biography|version|release|changelog|deprecated|deprecation)\b/i;

/**
 * Classifies whether a topic is technical (software, programming, tools, systems)
 * or non-technical (history, literature, humanities, law, biology, etc.).
 *
 * Rule 5 / Directive 5: Default to false (non-technical) unless the topic explicitly
 * names programming languages, software, tools, or systems.
 */
export function isTechnicalTopic(topic: string): boolean {
    if (!topic || typeof topic !== "string") return false;
    const trimmed = topic.trim();
    if (!trimmed) return false;
    return TECHNICAL_PATTERN.test(trimmed);
}

/**
 * Checks whether a topic belongs to a factual domain requiring web verification
 * (history, current events, politics, economics, finance, medicine, health, law,
 * specific science values, software versions).
 */
export function isFactualDomainTopic(topic: string): boolean {
    if (!topic || typeof topic !== "string") return false;
    const trimmed = topic.trim();
    if (!trimmed) return false;
    return FACTUAL_DOMAIN_PATTERN.test(trimmed);
}

/**
 * Cleans leading numbering prefixes like "1. ", "1 - ", "01. " from a section title.
 */
export function cleanSectionTitle(title: string): string {
    if (!title || typeof title !== "string") return "";
    return title.replace(/^\s*\d+\s*[\.\-\)]+\s*/, "").trim();
}

/**
 * Formats a clean section display title like "1. Pre-historic Karnataka"
 * avoiding duplicate prefixes like "1. 1.".
 */
export function formatSectionNumberTitle(indexZeroBased: number, rawTitle: string): string {
    const clean = cleanSectionTitle(rawTitle);
    return `${indexZeroBased + 1}. ${clean || `Section ${indexZeroBased + 1}`}`;
}

/**
 * Deduplicates leading H1 headings from section markdown content.
 * Removes ONLY the very first leading H1 if its text matches the section title,
 * leaving legitimately repeated headings deeper in the text completely intact.
 */
export function deduplicateSectionContent(content: string, rawTitle: string): string {
    if (!content || typeof content !== "string") return "";
    const cleanTitle = cleanSectionTitle(rawTitle).toLowerCase().trim();
    if (!cleanTitle) return content;

    const lines = content.split("\n");
    let foundFirstHeading = false;
    const outputLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!foundFirstHeading) {
            // Check if this line is an H1 heading before any body text
            const h1Match = trimmed.match(/^#\s+(.+)$/);
            if (h1Match) {
                foundFirstHeading = true;
                const h1Text = cleanSectionTitle(h1Match[1]).toLowerCase().trim();
                // If it matches the section title, skip this duplicate line
                if (h1Text === cleanTitle || cleanTitle.includes(h1Text) || h1Text.includes(cleanTitle)) {
                    continue;
                }
            } else if (trimmed.length > 0) {
                // Non-empty line that isn't H1 encountered first
                foundFirstHeading = true;
            }
        }

        outputLines.push(line);
    }

    return outputLines.join("\n").trim();
}

/**
 * Evaluates LaTeX math syntax vs shell variables.
 * Only treats $...$ as math when it contains mathematical operators, numbers, or equations.
 * Never treats shell variables ($PATH, $USER, $1, $?, $VAR) as math.
 */
export function sanitizeMathExpressions(text: string): string {
    if (!text || typeof text !== "string") return "";

    return text.replace(/\$([^$\n]+?)\$/g, (match, inner) => {
        const trimmed = inner.trim();
        // Shell variables: $VAR, $1, $? - do not treat as math
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
            return match; // preserve raw $VAR$ or $VAR
        }
        // Genuine math: contains math operators (=, +, -, *, /, ^, _, \cdot, \times, \pm, \approx, etc.) or single variable
        if (/[=+\-*/^_<>≤≥±≈·\\%]/.test(trimmed) || /^\s*[a-zA-Z]\s*$/.test(trimmed) || /^\d+(\.\d+)?$/.test(trimmed)) {
            return inner; // strip LaTeX math delimiters for clean text rendering
        }
        // Otherwise, leave intact
        return match;
    });
}

/**
 * Builds the research and outline prompt adhering to topic classification.
 */
export function buildResearchPrompt(topic: string, sectionCount = 5): string {
    const isTech = isTechnicalTopic(topic);

    if (!isTech) {
        return `You are an expert researcher, curriculum designer, and subject matter specialist.
Your task is to conduct an extremely thorough, exhaustive, and highly detailed research study on the topic: "${topic}" and design a comprehensive structured syllabus/document outline for generating high-quality learning guides or course materials.

TOPIC FIDELITY RULE:
This topic is strictly non-technical / domain-specific. DO NOT include programming code, software classes, database diagrams, or coding errors. Focus exclusively on the genuine academic, historical, scientific, or humanities concepts of this subject.

You MUST examine this topic in maximum depth, covering:
- Every key concept, historical context, core principles, standard terminology, and domain-specific knowledge.
- Crucial subtopics, background context, chronological or logical progression of lessons.
- Nuanced perspectives, verified facts, and foundational through advanced domain mastery.

Provide your findings as a highly detailed, comprehensive markdown report in 'researchNotes'. Leave no stone unturned and write a detailed analysis.
Suggest EXACTLY ${sectionCount} logical outline sections in the 'fields' list (do not return fewer than ${sectionCount} items). Each section must have:
- name: string (lowercase snake_case, e.g. 'historical_origins', 'cultural_renaissance')
- label: string (readable section title WITHOUT leading numbers, e.g. 'Historical Origins and Foundations', 'Cultural and Architectural Renaissance')
- type: string (must be exactly 'section')
- description: string (brief explanation of what this section should cover)
- rules: string (specific guidelines or details to generate)

You must return a JSON object with this exact structure:
{
  "researchNotes": "markdown report here",
  "fields": [
    { "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }
  ]
}

Ensure the type is strictly set to 'section'.`;
    }

    return `You are an expert technical writer, systems architect, and computer science curriculum designer.
Your task is to conduct an extremely thorough, exhaustive, and highly detailed research study on the technical topic: "${topic}" and design a comprehensive structured syllabus/document outline for generating high-quality learning guides or course materials.

You MUST examine this topic in maximum depth, covering:
- Every key concept, standard terminology, advanced implementation details, design patterns, and programming syntax.
- Crucial subtopics, background context, prerequisites, and production architecture.
- Logical progression of lessons (e.g. foundational mechanisms precede complex abstractions).
- Specific edge cases, pitfalls, security considerations, and common engineering errors.

Provide your findings as a highly detailed, comprehensive markdown report in 'researchNotes'. Leave no stone unturned and write a detailed analysis.
Suggest EXACTLY ${sectionCount} logical outline sections in the 'fields' list (do not return fewer than ${sectionCount} items). Each section must have:
- name: string (lowercase snake_case, e.g. 'core_architecture', 'concurrency_and_performance')
- label: string (readable section title WITHOUT leading numbers, e.g. 'Core Architecture & Internals', 'Concurrency & Performance Optimization')
- type: string (must be exactly 'section')
- description: string (brief explanation of what this section should cover)
- rules: string (specific technical guidelines or details to generate)

You must return a JSON object with this exact structure:
{
  "researchNotes": "markdown report here",
  "fields": [
    { "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }
  ]
}

Ensure the type is strictly set to 'section'.`;
}

/**
 * Builds the section generation prompt adhering to topic classification.
 */
export function buildSectionPrompt(
    topic: string,
    sectionLabel: string,
    sectionKey: string,
    sectionDescription: string,
    sectionRules: string,
    previousSectionsContext = ""
): string {
    const isTech = isTechnicalTopic(topic);

    let prompt = isTech
        ? `You are an expert technical writer and software engineering educator.`
        : `You are an expert academic writer, educator, and subject matter specialist.`;

    prompt += `\nYour task is to generate realistic, comprehensive, and highly-detailed educational course/guide content for a specific section of a document.

Main Topic: ${topic}
Target Section: ${sectionLabel} (key: ${sectionKey})
Overview of what to cover: ${sectionDescription}
Requirements & Rules: ${sectionRules}
`;

    if (previousSectionsContext) {
        prompt += `\nPrevious Chapters / Content Context (for continuity and flow):\n${previousSectionsContext}\n`;
    }

    prompt += `\nInstructions:
1. Write the section content in beautiful, valid Markdown. Do not repeat the section title as an H1 heading.
2. Use clear formatting, paragraphs, bullet points, and markdown tables where appropriate.
3. NO DECORATIVE ASCII ART BOXES: Do not draw decorative ASCII frame boxes or wireframes (such as "+---+"). Standard pipe characters (| and ||) and dollar signs ($) are completely legitimate and must be freely used inside tables, code blocks, shell commands, and logical expressions. Never replace pipes, dollars, or syntax symbols with placeholders like %%%.
`;

    if (isTech) {
        prompt += `4. Provide rich code blocks with syntax highlighting showing clear, correct, and readable examples. Include comments inside code examples to explain syntax.
5. If describing relational database join operations (INNER, LEFT, RIGHT, FULL), you may optionally include a \`\`\`json-diagram block.
`;
    } else {
        prompt += `4. STRICT DOMAIN FIDELITY: This topic is non-technical. Do NOT write programming code, Python classes, or database diagrams. Focus on rigorous domain analysis, factual accuracy, and detailed historical or scientific narrative.
`;
    }

    prompt += `6. Markdown tables: Ensure all markdown tables follow standard syntax with pipe characters and a header separator row.
7. Formatting integrity: Preserve all legitimate characters (|, ||, $, %, &, <, >, \\). Never introduce placeholder corruption like %%%.
8. Dive deep: provide comprehensive explanations, historical/technical depth, definitions, and practical context.
9. Return the raw markdown content ONLY. Do not wrap the response in JSON or conversational text.`;

    return prompt;
}
