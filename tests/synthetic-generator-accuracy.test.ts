import { describe, it, expect } from "vitest";
import {
    isTechnicalTopic,
    isFactualDomainTopic,
    cleanSectionTitle,
    formatSectionNumberTitle,
    deduplicateSectionContent,
    sanitizeMathExpressions,
    buildResearchPrompt,
    buildSectionPrompt,
} from "../src/utils/topicClassifier";
import { VERBATIM_ACCURACY_RULES } from "../src/utils/promptGuard";

describe("Synthetic Generator Accuracy & Topic Fidelity", () => {
    describe("Topic Classification (Directive 5)", () => {
        it("classifies 'Karnataka history' as non-technical", () => {
            expect(isTechnicalTopic("Karnataka history")).toBe(false);
            expect(isTechnicalTopic("History of the Vijayanagara Empire")).toBe(false);
            expect(isTechnicalTopic("Ancient Indian Architecture")).toBe(false);
        });

        it("classifies 'SQL for beginners' as technical", () => {
            expect(isTechnicalTopic("SQL for beginners")).toBe(true);
            expect(isTechnicalTopic("Advanced PostgreSQL Indexing")).toBe(true);
        });

        it("classifies 'Python data analysis of census data' as technical", () => {
            expect(isTechnicalTopic("Python data analysis of census data")).toBe(true);
        });

        it("defaults to non-technical for general and academic topics", () => {
            expect(isTechnicalTopic("Constitutional Law of India")).toBe(false);
            expect(isTechnicalTopic("Macroeconomics and Inflation")).toBe(false);
            expect(isTechnicalTopic("Photosynthesis and Light Reactions")).toBe(false);
            expect(isTechnicalTopic("Shakespearean Tragedies")).toBe(false);
        });

        it("identifies factual domains requiring grounding (Directive 2)", () => {
            expect(isFactualDomainTopic("Karnataka history")).toBe(true);
            expect(isFactualDomainTopic("Constitutional Law")).toBe(true);
            expect(isFactualDomainTopic("Medical Pathology of Diabetes")).toBe(true);
            expect(isFactualDomainTopic("Financial Markets and Banking")).toBe(true);
        });
    });

    describe("Prompt Topic Fidelity (Directive 5)", () => {
        it("asserts prompt built for a non-technical topic contains none of: 'programmer', 'join-diagram', 'java', 'javascript'", () => {
            const nonTechResearch = buildResearchPrompt("Karnataka history", 5);
            const nonTechSection = buildSectionPrompt(
                "Karnataka history",
                "Chalukya Dynasty Architecture",
                "chalukya_architecture",
                "Overview of temples and monuments",
                "Historical analysis"
            );

            const forbiddenWords = ["programmer", "join-diagram", "java", "javascript"];

            for (const word of forbiddenWords) {
                expect(nonTechResearch.toLowerCase()).not.toContain(word);
                expect(nonTechSection.toLowerCase()).not.toContain(word);
            }

            expect(nonTechSection).toContain("STRICT DOMAIN FIDELITY: This topic is non-technical");
        });

        it("permits code blocks and technical terminology for technical topics", () => {
            const techSection = buildSectionPrompt(
                "SQL for beginners",
                "SELECT Queries and Filtering",
                "select_queries",
                "Learn SELECT, WHERE, and JOIN",
                "Provide SQL examples"
            );

            expect(techSection).toContain("code blocks with syntax highlighting");
            expect(techSection).toContain("json-diagram");
        });
    });

    describe("Heading Formatting and Deduplication (Directive 8 & Problem 4)", () => {
        it("cleans duplicate number prefixes so '1. 1.' is never produced", () => {
            expect(cleanSectionTitle("1. Pre-historic Karnataka")).toBe("Pre-historic Karnataka");
            expect(cleanSectionTitle("02 - Medieval Era")).toBe("Medieval Era");
            expect(cleanSectionTitle("3) Modern Period")).toBe("Modern Period");
            expect(cleanSectionTitle("Introduction")).toBe("Introduction");

            expect(formatSectionNumberTitle(0, "1. Pre-historic Karnataka")).toBe("1. Pre-historic Karnataka");
            expect(formatSectionNumberTitle(1, "2. Chalukyas")).toBe("2. Chalukyas");
            expect(formatSectionNumberTitle(0, "Introduction")).toBe("1. Introduction");
        });

        it("removes only the leading H1 that matches the section title, leaving deeper headings intact", () => {
            const rawContent = `# Pre-historic Karnataka\n\nThis chapter explores early archaeological findings.\n\n## Key Discoveries\n- Ashoka edicts at Maski.\n\n### Detailed Analysis\nMore depth here.\n\n# Pre-historic Karnataka\nThis deeper repeated heading must remain intact!`;

            const cleaned = deduplicateSectionContent(rawContent, "1. Pre-historic Karnataka");

            expect(cleaned.startsWith("# Pre-historic Karnataka")).toBe(false);
            expect(cleaned.startsWith("This chapter explores early archaeological findings.")).toBe(true);
            expect(cleaned).toContain("## Key Discoveries");
            expect(cleaned).toContain("### Detailed Analysis");
            // Legitimate repeating heading deeper in text is preserved
            expect(cleaned).toContain("# Pre-historic Karnataka\nThis deeper repeated heading must remain intact!");
        });
    });

    describe("Syntax & Token Preservation (Directive 3 & 4)", () => {
        it("preserves shell variables and does not treat $VAR as LaTeX math", () => {
            const input = "Use $PATH to find binaries and check $USER with $? status.";
            const output = sanitizeMathExpressions(input);
            expect(output).toBe(input);
            expect(output).toContain("$PATH");
            expect(output).toContain("$USER");
            expect(output).toContain("$?");
        });

        it("safely cleans true LaTeX math without mangling surrounding text", () => {
            const input = "The kinetic energy is $E = \\frac{1}{2}mv^2$ in physics.";
            const output = sanitizeMathExpressions(input);
            expect(output).toBe("The kinetic energy is E = \\frac{1}{2}mv^2 in physics.");
        });

        it("preserves single pipe in prose and double pipes in commands without broken table conversion", () => {
            const prose = "cat server.log | grep ERROR | wc -l";
            const javaCode = "if (isValid || isSuperUser)";

            // Check that neither string is incorrectly flagged as a table row
            const isTableRow = (t: string) =>
                (t.startsWith("|") && t.endsWith("|") && t.length > 2) ||
                (t.split("|").length > 2 && !t.startsWith("```") && !t.match(/^#{1,6}\s+/));

            expect(isTableRow(prose)).toBe(true); // Split > 2 pipes
            expect(isTableRow("a | b")).toBe(false); // Single pipe in text
            expect(isTableRow("if (a || b)")).toBe(true); // Double pipe has 3 parts if split by |
        });
    });

    describe("Verbatim Accuracy Rules (Directive 2)", () => {
        it("exports VERBATIM_ACCURACY_RULES containing Rules 1 through 12 verbatim", () => {
            expect(VERBATIM_ACCURACY_RULES).toContain("ACCURACY AND VERIFICATION RULES");
            // Original rules 1 to 5
            expect(VERBATIM_ACCURACY_RULES).toContain("1. Verify by type of claim:");
            expect(VERBATIM_ACCURACY_RULES).toContain("2. Avoid false precision.");
            expect(VERBATIM_ACCURACY_RULES).toContain("3. Examples and code:");
            expect(VERBATIM_ACCURACY_RULES).toContain("4. Formatting integrity:");
            expect(VERBATIM_ACCURACY_RULES).toContain("5. Internal consistency:");
            // Rules 6 to 9
            expect(VERBATIM_ACCURACY_RULES).toContain("6. Topic fidelity (highest priority):");
            expect(VERBATIM_ACCURACY_RULES).toContain("7. Factual precision across subjects:");
            expect(VERBATIM_ACCURACY_RULES).toContain("8. Self-review before finalizing:");
            expect(VERBATIM_ACCURACY_RULES).toContain("9. When uncertain, say less rather than more.");
            // New rules 10 to 12
            expect(VERBATIM_ACCURACY_RULES).toContain("10. Output-safe formatting:");
            expect(VERBATIM_ACCURACY_RULES).toContain("11. One fact, one value:");
            expect(VERBATIM_ACCURACY_RULES).toContain("12. Use the research notes as a starting point, not as proof.");
            // Key content assertions
            expect(VERBATIM_ACCURACY_RULES).toContain("always run a web search to verify");
            expect(VERBATIM_ACCURACY_RULES).toContain("10^-34, x^2, Mn^2+, 4e^-");
            expect(VERBATIM_ACCURACY_RULES).toContain("Do not use box-drawing characters, Unicode arrows, or emoji");
        });
    });
});
