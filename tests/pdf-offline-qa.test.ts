import { describe, it, expect } from "vitest";
import { normalizeTextForExport, convertLatexToPlainText, isGroundingTopic } from "../src/utils/topicClassifier";
import { extractTextFromPdfBuffer, validatePdfText } from "../scripts/qa-pdf.mjs";

/**
 * Creates a valid PDF binary buffer containing the given lines of text.
 * Simulates jsPDF PDF generation with Helvetica font.
 */
function generatePdfBuffer(lines: string[]): Buffer {
    let stream = "BT\n/F1 12 Tf\n20 750 Td\n16 TL\n";
    for (const line of lines) {
        const escaped = line
            .replace(/\\/g, "\\\\")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)");
        stream += `(${escaped}) Tj\nT*\n`;
    }
    stream += "ET";
    const streamLen = Buffer.byteLength(stream, "latin1");

    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
370
%%EOF`;

    return Buffer.from(pdf, "latin1");
}

describe("Offline PDF Export & QA Verification Pipeline", () => {
    const rawSampleText = `
# System Architecture & Photochemical Reactions
# System Architecture & Photochemical Reactions

Here is a system box diagram:
┌──────────────┐
│  Worker A    │
└──────────────┘

Process flow:
Worker A → Worker B
↓
Database Engine

Numerical limits and tolerances:
Reaction efficiency is ≈ 98.5%.
Threshold bounds: 10 ≤ x and y ≥ 50, with error ≠ 0.
Greek hyper-parameters: α = 0.05 and β = 0.99.

Photochemical equations and catalysts:
$2H_2O \\rightarrow 4H^+ + 4e^- + O_2$
Oxygen evolving complex: $Mn_4CaO_5$
Reaction center primary donor is P_{700} and catalyst is Mn^{2+}.
Slope ratio is \\frac{14}{3}.

Shell commands and scripts:
cat a | grep b
if (a || b)
echo $PATH
echo $USER
check status $?
`;

    it("verifies BEFORE state fails QA checks due to jsPDF WinAnsi truncation and raw LaTeX", () => {
        // In standard un-normalized jsPDF output:
        // "─" (U+2500) renders as high-byte 0x25 = "%", so "───" produces "%%%"
        // "≈" (U+2248) renders as 0x22 0x48 = '"H'
        // Raw LaTeX remains unparsed ($Mn_4CaO_5$, P_{700}, \frac{14}{3})
        // Heading is repeated directly below banner
        const simulatedBeforePdfText = [
            "# System Architecture & Photochemical Reactions",
            "# System Architecture & Photochemical Reactions",
            "+---+",
            "| Worker A |",
            "%%%", // Corrupted horizontal line in standard jsPDF
            "Reaction efficiency is \"H 98.5%.", // Corrupted ≈
            "$Mn_4CaO_5$", // Raw LaTeX
            "Donor is P_{700}", // Raw subscript
            "Catalyst is Mn^{2+}", // Raw superscript
            "cat a | grep b",
            "if (a || b)",
            "echo $PATH",
        ];

        const beforePdf = generatePdfBuffer(simulatedBeforePdfText);
        const extractedBeforeText = extractTextFromPdfBuffer(beforePdf);

        const beforeErrors = validatePdfText(extractedBeforeText);

        console.log("=== BEFORE FIX QA OUTPUT ===");
        console.log(extractedBeforeText);
        console.log("BEFORE ERRORS DETECTED:", beforeErrors);

        // Asserts BEFORE state fails with expected corruption markers
        expect(beforeErrors.length).toBeGreaterThan(0);
        expect(beforeErrors.some(e => e.includes("%%%"))).toBe(true);
        expect(beforeErrors.some(e => e.includes('"H'))).toBe(true);
        expect(beforeErrors.some(e => e.includes("LaTeX"))).toBe(true);
        expect(beforeErrors.some(e => e.includes("repeated heading"))).toBe(true);
    });

    it("verifies AFTER state normalizes all characters, converts LaTeX, preserves shell lines, and passes QA 100%", () => {
        // Run sample through the normalizer and LaTeX converter
        const normalized = normalizeTextForExport(rawSampleText);

        // Remove duplicate banner heading for export
        const lines = normalized.split("\n").filter(Boolean);
        // Deduplicate consecutive identical headings
        const deduplicatedLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            if (i > 0 && lines[i].trim() === lines[i - 1].trim() && lines[i].startsWith("#")) {
                continue;
            }
            deduplicatedLines.push(lines[i]);
        }

        const afterPdf = generatePdfBuffer(deduplicatedLines);
        const extractedAfterText = extractTextFromPdfBuffer(afterPdf);

        console.log("=== AFTER FIX QA OUTPUT ===");
        console.log(extractedAfterText);

        // Run strict QA script validator
        const afterErrors = validatePdfText(extractedAfterText);

        console.log("AFTER ERRORS DETECTED:", afterErrors);

        // Asserts AFTER state passes with ZERO errors
        expect(afterErrors).toEqual([]);

        // Verify specific required conversions:
        // 1. Box drawing converted to + - |
        expect(extractedAfterText).toContain("+--------------+");
        expect(extractedAfterText).toContain("|  Worker A    |");

        // 2. Arrows converted to -> and v
        expect(extractedAfterText).toContain("Worker A -> Worker B");
        expect(extractedAfterText).toContain("v");

        // 3. Math symbols converted to ~ <= >= !=
        expect(extractedAfterText).toContain("~ 98.5%");
        expect(extractedAfterText).toContain("10 <= x");
        expect(extractedAfterText).toContain("y >= 50");
        expect(extractedAfterText).toContain("error != 0");

        // 4. Greek letters converted to names
        expect(extractedAfterText).toContain("alpha = 0.05");
        expect(extractedAfterText).toContain("beta = 0.99");

        // 5. LaTeX equations converted to readable text (exponents preserved per Rule 10)
        expect(extractedAfterText).toContain("2H2O -> 4H^+ + 4e^- + O2");
        expect(extractedAfterText).toContain("Mn4CaO5");
        expect(extractedAfterText).toContain("P700");
        expect(extractedAfterText).toContain("Mn^2+");
        expect(extractedAfterText).toContain("14/3 = 4.67");

        // 6. Shell lines strictly preserved
        expect(extractedAfterText).toContain("cat a | grep b");
        expect(extractedAfterText).toContain("if (a || b)");
        expect(extractedAfterText).toContain("echo $PATH");
        expect(extractedAfterText).toContain("echo $USER");
        expect(extractedAfterText).toContain("check status $?");

        // 7. No character above U+00FF
        for (let i = 0; i < extractedAfterText.length; i++) {
            expect(extractedAfterText.charCodeAt(i)).toBeLessThanOrEqual(255);
        }
    });

    it("verifies shell lines with code blocks and variables are untouched", () => {
        const shellSnippet = "cat a | grep b\nif (a || b) {\n  echo $PATH\n  echo $USER\n  return $?\n}";
        const processed = convertLatexToPlainText(shellSnippet);
        expect(processed).toContain("cat a | grep b");
        expect(processed).toContain("if (a || b)");
        expect(processed).toContain("echo $PATH");
        expect(processed).toContain("echo $USER");
        expect(processed).toContain("return $?");
    });

    it("verifies cosmetic polish: single-letter subscripts, stray carets, dropped horizontal rules, and arrow glyphs", () => {
        const cosmeticInput = [
            "# Chapter 1. Bioenergetics",
            "Electron acceptor F_X transfers electrons to b_L and primary acceptor A_0.",
            "Primary donor P700+^ is reduced, and orientation angle is 360^ deg.",
            "---",
            "Reversible equilibrium: A ⇌ B and B ⇋ A.",
            "Cyclic electron pathway: PSI ↻ PSI and alternative ↺.",
            "Branching pathways: ⤴ and ⤵, with hooks ↪ and ↩, and bidirectional ⇄ and ⇆."
        ].join("\n");

        const normalized = normalizeTextForExport(cosmeticInput);

        // 1. Single letter subscripts converted: F_X -> FX, b_L -> bL, A_0 -> A0
        expect(normalized).toContain("FX");
        expect(normalized).toContain("bL");
        expect(normalized).toContain("A0");
        expect(normalized).not.toContain("F_X");
        expect(normalized).not.toContain("b_L");
        expect(normalized).not.toContain("A_0");

        // 2. Stray carets cleaned: P700+^ -> P700+, 360^ deg -> 360 deg
        expect(normalized).toContain("P700+");
        expect(normalized).toContain("360 deg");
        expect(normalized).not.toContain("P700+^");
        expect(normalized).not.toContain("360^ deg");

        // 3. Horizontal rule --- is completely dropped
        const normalizedLines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
        expect(normalizedLines.some(l => /^[-*_]{3,}$/.test(l))).toBe(false);

        // 4. Missing arrows converted without any '?'
        expect(normalized).toContain("A <=> B");
        expect(normalized).toContain("PSI -> PSI");
        expect(normalized).toContain("<-");
        expect(normalized).toContain("^ and v");
        expect(normalized).not.toContain("?");

        // 5. Generate PDF and run strict QA validator
        const pdfBuf = generatePdfBuffer(normalizedLines);
        const extracted = extractTextFromPdfBuffer(pdfBuf);
        const qaErrors = validatePdfText(extracted);

        expect(qaErrors).toEqual([]);
        expect(extracted).not.toContain("?");
        expect(extracted).not.toContain("---");
    });

    it("strictly preserves task_struct, sched_setaffinity, MAX_TEXT, and YAML --- in code block while converting F_X, A_0, H_2O", () => {
        const input = [
            "# Kernel Subsystems and Photochemical Transfer",
            "Inside kernel scheduler, `task_struct` maintains task state and process tree.",
            "The syscall sched_setaffinity controls core affinity, and oom_score_adj regulates OOM killer.",
            "Buffer limit constant MAX_TEXT and thread-local my_var are unaffected.",
            "",
            "```yaml",
            "---",
            "descriptor: task_struct",
            "affinity: sched_setaffinity",
            "max_buffer: MAX_TEXT",
            "---",
            "```",
            "",
            "---",
            "",
            "In photosynthesis reactions:",
            "Acceptor F_X transfers electrons to A_0.",
            "Water photolysis yields H_2O and 2H_2O -> 4H+ + 4e- + O_2.",
        ].join("\n");

        const normalized = normalizeTextForExport(input);

        // 1. snake_case identifiers outside code and in inline code stay completely unchanged
        expect(normalized).toContain("task_struct");
        expect(normalized).toContain("sched_setaffinity");
        expect(normalized).toContain("oom_score_adj");
        expect(normalized).toContain("MAX_TEXT");
        expect(normalized).toContain("my_var");
        expect(normalized).not.toContain("taskstruct");
        expect(normalized).not.toContain("schedsetaffinity");
        expect(normalized).not.toContain("oomscoreadj");
        expect(normalized).not.toContain("MAXTEXT");
        expect(normalized).not.toContain("myvar");

        // 2. YAML code block retains its --- lines unchanged
        expect(normalized).toMatch(/```yaml\s*\n---\n[\s\S]*?\n---\s*\n```/);

        // 3. Standalone horizontal rule --- outside the code block is dropped
        const nonCodeText = normalized.replace(/```[\s\S]*?```/g, "");
        const linesOutsideCode = nonCodeText.split("\n").map(l => l.trim()).filter(Boolean);
        expect(linesOutsideCode.some(l => /^[-*_]{3,}$/.test(l))).toBe(false);

        // 4. Math and chemistry subscripts F_X, A_0, H_2O are converted
        expect(normalized).toContain("FX");
        expect(normalized).toContain("A0");
        expect(normalized).toContain("H2O");
        expect(normalized).toContain("2H2O");
        expect(normalized).not.toContain("F_X");
        expect(normalized).not.toContain("A_0");
        expect(normalized).not.toContain("H_2O");

        // 5. Generate PDF and run strict QA validator
        const pdfBuf = generatePdfBuffer(normalized.split("\n").filter(Boolean));
        const extracted = extractTextFromPdfBuffer(pdfBuf);
        const qaErrors = validatePdfText(extracted);

        expect(qaErrors).toEqual([]);
        expect(extracted).toContain("task_struct");
        expect(extracted).toContain("sched_setaffinity");
        expect(extracted).toContain("MAX_TEXT");
        expect(extracted).toContain("FX");
        expect(extracted).toContain("A0");
        expect(extracted).toContain("H2O");
    });

    it("ensures uppercase constant identifiers like ARG_1, SIGRTMIN_1, and PIPE_2 stay unchanged outside code, while F_X, A_0, and H_2O are converted", () => {
        const input = [
            "Posix signals and pipeline descriptors:",
            "Parameter ARG_1 is passed to system call, and signal SIGRTMIN_1 triggers handler.",
            "Inter-process descriptor PIPE_2 is opened in non-blocking mode.",
            "",
            "Biochemical energy reaction:",
            "Photosystem I complex uses electron acceptor F_X and primary donor A_0.",
            "Water photolysis yields H_2O and 2H_2O -> 4H+ + 4e- + O_2.",
        ].join("\n");

        const normalized = normalizeTextForExport(input);

        // Constants must stay completely unchanged outside code blocks
        expect(normalized).toContain("ARG_1");
        expect(normalized).toContain("SIGRTMIN_1");
        expect(normalized).toContain("PIPE_2");
        expect(normalized).not.toContain("ARG1");
        expect(normalized).not.toContain("SIGRTMIN1");
        expect(normalized).not.toContain("PIPE2");

        // Single letter and chemistry subscripts must still be converted
        expect(normalized).toContain("FX");
        expect(normalized).toContain("A0");
        expect(normalized).toContain("H2O");
        expect(normalized).toContain("2H2O");
        expect(normalized).not.toContain("F_X");
        expect(normalized).not.toContain("A_0");
        expect(normalized).not.toContain("H_2O");

        // Validate PDF rendering
        const pdfBuf = generatePdfBuffer(normalized.split("\n").filter(Boolean));
        const extracted = extractTextFromPdfBuffer(pdfBuf);
        expect(extracted).toContain("ARG_1");
        expect(extracted).toContain("SIGRTMIN_1");
        expect(extracted).toContain("PIPE_2");
        expect(extracted).toContain("FX");
        expect(extracted).toContain("A0");
        expect(extracted).toContain("H2O");
    });

    it("evaluates isGroundingTopic accurately for factual, version, timely, UI, and coding topics", () => {
        // Required test cases from prompt:
        expect(isGroundingTopic("AWS Console latest UI")).toBe(true);
        expect(isGroundingTopic("Java 21 modern features")).toBe(true);
        expect(isGroundingTopic("Python 3.13 new features")).toBe(true);
        expect(isGroundingTopic("Java from basic to advanced")).toBe(true);
        expect(isGroundingTopic("Docker Compose current workflow")).toBe(true);
        expect(isGroundingTopic("Binary search implementation in Java")).toBe(false);
        expect(isGroundingTopic("Solve quadratic equations")).toBe(false);

        // Previous baseline factual topics:
        expect(isGroundingTopic("Karnataka History")).toBe(true);
        expect(isGroundingTopic("Linux kernel scheduling")).toBe(true);
        expect(isGroundingTopic("Photosynthesis constants")).toBe(true);
    });

    it("converts multi-letter biochemical chemistry subscripts (PQH_2 -> PQH2, CF_0CF_1 -> CF0CF1) without touching snake_case, constants, or code", () => {
        const input = [
            "Photosynthetic transport carriers and synthase complexes:",
            "Once QB accepts electrons, it is reduced to Plastoquinol (PQH_2).",
            "Chemiosmotic ATP generation utilizes the CF_0CF_1-ATP synthase complex.",
            "The hydrophobic CF_0 domain spans the thylakoid, while the catalytic CF_1 domain protrudes into stroma.",
            "Enzyme hexamer alternating subunits: alpha_3beta_3 catalytic head.",
            "",
            "Programming and OS identifiers (MUST NOT CHANGE):",
            "struct task_struct *task = sched_setaffinity(pid, mask);",
            "oom_score_adj setting with MAX_TEXT buffer and local my_var pointer.",
            "POSIX arguments ARG_1 and signals SIGRTMIN_1 through PIPE_2 descriptors.",
            "",
            "Code block with snake_case and subscripts inside fences (MUST NOT CHANGE):",
            "```c",
            "int handle_PQH_2(struct task_struct *t, int CF_0CF_1) {",
            "    return t->oom_score_adj + ARG_1;",
            "}",
            "```"
        ].join("\n");

        const normalized = normalizeTextForExport(input);

        // Biochemical multi-letter subscripts converted outside code
        expect(normalized).toContain("PQH2");
        expect(normalized).toContain("CF0CF1-ATP synthase");
        expect(normalized).toContain("CF0 domain");
        expect(normalized).toContain("CF1 domain");
        expect(normalized).toContain("alpha3beta3");
        expect(normalized).not.toContain("PQH_2).");
        expect(normalized).not.toContain("CF_0CF_1-ATP");
        expect(normalized).not.toContain("CF_0 domain");
        expect(normalized).not.toContain("CF_1 domain");

        // Programming snake_case and constants stay completely unchanged
        expect(normalized).toContain("task_struct");
        expect(normalized).toContain("sched_setaffinity");
        expect(normalized).toContain("oom_score_adj");
        expect(normalized).toContain("MAX_TEXT");
        expect(normalized).toContain("my_var");
        expect(normalized).toContain("ARG_1");
        expect(normalized).toContain("SIGRTMIN_1");
        expect(normalized).toContain("PIPE_2");

        // Code block internals stay strictly unchanged
        expect(normalized).toContain("handle_PQH_2");
        expect(normalized).toContain("CF_0CF_1");

        // Validate PDF output produces zero QA errors
        const pdfBuf = generatePdfBuffer(normalized.split("\n").filter(Boolean));
        const extracted = extractTextFromPdfBuffer(pdfBuf);
        const qaErrors = validatePdfText(extracted);
        expect(qaErrors).toEqual([]);
        expect(extracted).toContain("PQH2");
        expect(extracted).toContain("CF0CF1");
        expect(extracted).toContain("task_struct");
        expect(extracted).toContain("ARG_1");
    });

    it("maps the full Box Drawing, Block Elements, Geometric Shapes, and Arrows ranges without leaving '?' glyphs in diagrams", () => {
        const diagramInput = [
            "Cyclic photophosphorylation electron flow diagram:",
            "```",
            "                            [ Cytochrome b6f Complex ] --► (H+ pumped into lumen)",
            "                                       ▼",
            "                                       +---------► Returns to [ P700+ ]",
            "```",
            "",
            "Text flow with various box drawings, block elements, shapes, and arrows:",
            "┌───┬───┐ █▀▄ ▲ ▼ ◄ ► ● ◆ → ← ↑ ↓ ↔",
            "Catch-all unmapped box drawing: ╵ (U+2575)",
            "Catch-all unmapped block: ▚ (U+259A)",
            "Catch-all unmapped geometric shape: ◬ (U+25EC)",
            "Catch-all unmapped arrow: ⇲ (U+21F2)"
        ].join("\n");

        const normalized = normalizeTextForExport(diagramInput);

        // Diagram arrows and geometric pointers are cleanly converted to ASCII
        expect(normalized).toContain("[ Cytochrome b6f Complex ] --> (H+ pumped into lumen)");
        expect(normalized).toContain("v");
        expect(normalized).toContain("+---------> Returns to [ P700+ ]");

        // No stray '?' glyphs in diagram
        expect(normalized).not.toContain("--?");
        expect(normalized).not.toContain("+---------?");

        // Shapes and arrows mapped to ASCII
        expect(normalized).toContain("+---+---+");
        expect(normalized).toContain("#");
        expect(normalized).toContain("^");
        expect(normalized).toContain("v");
        expect(normalized).toContain("<");
        expect(normalized).toContain(">");
        expect(normalized).toContain("*");
        expect(normalized).toContain("->");
        expect(normalized).toContain("<-");
        expect(normalized).toContain("<=>");

        // Assert no '?' was introduced for any of these ranges
        const questionMarks = (normalized.match(/\?/g) || []).length;
        expect(questionMarks).toBe(0);
    });

    it("logs unmapped code points above U+00FF in hex format U+XXXX when replaced with '?'", () => {
        const consoleSpy: string[] = [];
        const originalWarn = console.warn;
        console.warn = (...args: unknown[]) => {
            consoleSpy.push(args.map(String).join(" "));
            originalWarn(...args);
        };

        try {
            // Include an emoji / unsupported unmapped code point (e.g. U+1F600 Grinning Face, U+0370 Heta)
            const inputWithUnmapped = "Some unmapped character: \u0370 and 😀.";
            const normalized = normalizeTextForExport(inputWithUnmapped);

            expect(normalized).toContain("?");
            // Normalizer must have logged the hex code point
            expect(consoleSpy.some(log => log.includes("U+0370") || log.includes("U+1F600"))).toBe(true);
        } finally {
            console.warn = originalWarn;
        }
    });

    it("preserves exponents with carets and signs (10^-34, x^2, Mn^2+, 4e^-) per Rule 10", () => {
        const input = [
            "Planck's constant h = 6.626 x 10^-34 J*s.",
            "Pythagorean theorem: x^2 + y^2 = z^2.",
            "Manganese catalyst Mn^2+ in the OEC.",
            "Water photolysis releases 4e^- electrons.",
            "Photon energy E = h*v where v is frequency.",
            "Stray trailing caret after charge: P700+^ should be cleaned.",
            "Angle measure: 360^ deg should become 360 deg.",
        ].join("\n");

        const normalized = normalizeTextForExport(input);

        // Exponents MUST be preserved with caret and sign
        expect(normalized).toContain("10^-34");
        expect(normalized).toContain("x^2");
        expect(normalized).toContain("Mn^2+");
        expect(normalized).toContain("4e^-");
        expect(normalized).toContain("y^2");
        expect(normalized).toContain("z^2");

        // Must NOT strip carets from exponents
        expect(normalized).not.toContain("10-34 J");
        expect(normalized).not.toContain("4e- electrons");

        // Stray trailing caret after charge IS cleaned
        expect(normalized).toContain("P700+");
        expect(normalized).not.toContain("P700+^");

        // Degree caret IS cleaned
        expect(normalized).toContain("360 deg");
        expect(normalized).not.toContain("360^");

        // Validate PDF rendering
        const pdfBuf = generatePdfBuffer(normalized.split("\n").filter(Boolean));
        const extracted = extractTextFromPdfBuffer(pdfBuf);
        expect(extracted).toContain("10^-34");
        expect(extracted).toContain("x^2");
        expect(extracted).toContain("Mn^2+");
        expect(extracted).toContain("4e^-");
    });
});
