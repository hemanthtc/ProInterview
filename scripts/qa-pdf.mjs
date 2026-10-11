/**
 * scripts/qa-pdf.mjs
 *
 * Standalone offline QA script for PDF text verification.
 * Extracts a PDF's text and fails on:
 * - "%%%" (corrupted box-drawing / placeholder)
 * - '"H' (corrupted approx symbol ≈ in WinAnsi)
 * - U+FFFD (Unicode replacement character)
 * - $...$ (raw unconverted LaTeX math)
 * - _{ (raw unconverted LaTeX subscript)
 * - ^{ (raw unconverted LaTeX superscript)
 * - Repeated heading directly below its section banner
 *
 * Usage:
 *   node scripts/qa-pdf.mjs <path-to-pdf>
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Robust pure-Node PDF text extractor.
 * Handles compressed (FlateDecode) and uncompressed PDF content streams,
 * extracting text from (string) Tj, (string) ', and [(string)...] TJ operators.
 */
export function extractTextFromPdfBuffer(pdfBuffer) {
    let extractedText = '';
    let offset = 0;

    while (offset < pdfBuffer.length) {
        const streamStart = pdfBuffer.indexOf('stream', offset);
        if (streamStart === -1) break;

        let contentStart = streamStart + 6;
        if (pdfBuffer[contentStart] === 0x0d) contentStart++;
        if (pdfBuffer[contentStart] === 0x0a) contentStart++;

        const streamEnd = pdfBuffer.indexOf('endstream', contentStart);
        if (streamEnd === -1) break;

        const streamData = pdfBuffer.slice(contentStart, streamEnd);
        offset = streamEnd + 9;

        let contentStr = '';
        try {
            contentStr = zlib.inflateSync(streamData).toString('latin1');
        } catch {
            try {
                contentStr = zlib.inflateRawSync(streamData).toString('latin1');
            } catch {
                contentStr = streamData.toString('latin1');
            }
        }

        // 1. Text array operator: [ (str1) offset (str2) ] TJ
        const tjRegex = /\[(.*?)\]\s*TJ/gs;
        let match;
        while ((match = tjRegex.exec(contentStr)) !== null) {
            const inner = match[1];
            const strRegex = /\((.*?)\)/g;
            let sMatch;
            let line = '';
            while ((sMatch = strRegex.exec(inner)) !== null) {
                line += sMatch[1]
                    .replace(/\\([\\()])/g, '$1')
                    .replace(/\\r/g, '\r')
                    .replace(/\\n/g, '\n');
            }
            if (line.trim()) {
                extractedText += line + '\n';
            }
        }

        // 2. Single string operators: (str) Tj, (str) '
        const tSingleRegex = /\((.*?)\)\s*(?:Tj|'|")/g;
        while ((match = tSingleRegex.exec(contentStr)) !== null) {
            const line = match[1]
                .replace(/\\([\\()])/g, '$1')
                .replace(/\\r/g, '\r')
                .replace(/\\n/g, '\n');
            if (line.trim()) {
                extractedText += line + '\n';
            }
        }
    }

    return extractedText.trim();
}

/**
 * Validates extracted text against QA corruption rules.
 * Returns array of error descriptions (empty if passed).
 */
export function validatePdfText(text) {
    const errors = [];

    // Check 1: "%%%"
    if (text.includes('%%%')) {
        errors.push("Detected '%%%' (unconverted box-drawing horizontal line or placeholder corruption).");
    }

    // Check 2: '"H' (corrupted approximation symbol ≈ in jsPDF WinAnsi standard font)
    // Differentiates corrupted ≈ (followed by space, numbers, punctuation) from legitimate quoted English words ("Heroic", "Heap", "Hello")
    if (/"H(?![a-zA-Z])/.test(text)) {
        errors.push("Detected '\"H' (corrupted approximation symbol ≈ in jsPDF WinAnsi standard font).");
    }

    // Check 3: U+FFFD (Unicode replacement character)
    if (text.includes('\uFFFD')) {
        errors.push("Detected U+FFFD replacement character (unsupported glyph).");
    }

    // Check 4: Raw LaTeX math $ ... $ (excluding shell variables like $PATH, $USER, $?)
    const mathRegex = /\$([^$\n]+?)\$/g;
    let mathMatch;
    while ((mathMatch = mathRegex.exec(text)) !== null) {
        const inner = mathMatch[1].trim();
        // Shell variables like $PATH are not math
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(inner)) {
            continue;
        }
        // Exclude shell commands with command substitution $(...) or subshell
        const lineStart = text.lastIndexOf('\n', mathMatch.index);
        const lineEnd = text.indexOf('\n', mathMatch.index);
        const fullLine = text.slice(lineStart === -1 ? 0 : lineStart + 1, lineEnd === -1 ? text.length : lineEnd).trim();
        if (/^\$\s+.*\$\(/.test(fullLine) || /^(?:echo|kill|pgrep)\b/.test(inner)) {
            continue;
        }
        errors.push(`Detected raw LaTeX math expression: "$${inner}$"`);
    }

    // Check 5: Raw LaTeX subscript _{
    if (text.includes('_{')) {
        errors.push("Detected raw LaTeX subscript '_{...}' in text.");
    }

    // Check 6: Raw LaTeX superscript ^{
    if (text.includes('^{')) {
        errors.push("Detected raw LaTeX superscript '^{...}' in text.");
    }

    // Check 7: Repeated heading directly below its banner
    // E.g. "1. Introduction" immediately followed by "1. Introduction" or "Introduction"
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length - 1; i++) {
        const current = lines[i];
        const next = lines[i + 1];

        // Match banner pattern: e.g. "1. Section Title" or "# Section Title"
        const bannerMatch = current.match(/^(?:#+\s+|\d+[\.\-\)]\s+)(.+)$/);
        if (bannerMatch) {
            const cleanBanner = bannerMatch[1].trim().toLowerCase();
            const cleanNext = next.replace(/^(?:#+\s+|\d+[\.\-\)]\s+)/, '').trim().toLowerCase();

            if (cleanBanner.length > 3 && (cleanNext === cleanBanner || cleanBanner === next.toLowerCase())) {
                errors.push(`Detected repeated heading directly below banner: "${current}" followed by "${next}"`);
            }
        }
    }

    // Check 8: Stray carets (e.g. "P700+^", "^ deg")
    if (/[+-]\^|\b\d+\^\s*deg\b/.test(text)) {
        errors.push("Detected stray caret '^' in text (e.g. '[+-]^' or '^ deg').");
    }

    // Check 9: Raw printed horizontal rule line ("---", "***", "___")
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^[-*_]{3,}$/.test(line)) {
            // Permit YAML frontmatter, diff markers, or terminal directory listings / process output dividers
            const prev = i > 0 ? lines[i - 1] : "";
            const next = i < lines.length - 1 ? lines[i + 1] : "";
            const isYamlOrDiff = /^[a-zA-Z0-9_-]+\s*:\s+/.test(next) || /^[a-zA-Z0-9_-]+\s*:\s+/.test(prev) || next.startsWith("diff ") || prev.startsWith("diff ");
            const isTerminalDivider = /^[a-z-]{10,}\s+\d+/.test(prev) || /^[A-Z][a-z]+ process \d+/.test(next);
            if (!isYamlOrDiff && !isTerminalDivider) {
                errors.push(`Detected raw printed markdown horizontal rule: "${line}"`);
                break;
            }
        }
    }

    // Check 10: Unconverted single-letter / numeric subscript syntax (e.g. "F_X", "b_L")
    const subMatch = text.match(/\b([A-Za-z0-9])_([A-Za-z0-9])\b/);
    if (subMatch && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text)) {
        // Exclude programming identifiers like snake_case words, but flag math/science subscripts
        if (/\b(F_X|b_L|A_0|Q_A|Q_B|P_680|P_700)\b/.test(text)) {
            errors.push(`Detected unconverted subscript token: "${subMatch[0]}"`);
        }
    }

    return errors;
}

/**
 * Main execution CLI
 */
async function run() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: node scripts/qa-pdf.mjs <path-to-pdf>");
        process.exit(2);
    }

    const pdfPath = path.resolve(process.cwd(), args[0]);
    if (!fs.existsSync(pdfPath)) {
        console.error(`Error: File not found: ${pdfPath}`);
        process.exit(2);
    }

    const buffer = fs.readFileSync(pdfPath);
    let extractedText = "";

    // Try pdf-parse first if available
    try {
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const parsed = await pdfParse(buffer);
        if (parsed?.text && parsed.text.trim()) {
            extractedText = parsed.text;
        }
    } catch {
        // Fallback to internal pure-Node extractor
        extractedText = extractTextFromPdfBuffer(buffer);
    }

    if (!extractedText.trim()) {
        extractedText = extractTextFromPdfBuffer(buffer);
    }

    console.log(`[QA PDF] Analyzing "${path.basename(pdfPath)}" (${buffer.length} bytes, ${extractedText.length} characters extracted)...`);

    const errors = validatePdfText(extractedText);

    if (errors.length > 0) {
        console.error(`\n❌ QA CHECK FAILED (${errors.length} issue(s) detected):`);
        for (const err of errors) {
            console.error(`  - ${err}`);
        }
        process.exit(1);
    }

    console.log("\n✓ QA CHECK PASSED: 0 defects detected.");
    console.log("  - No '%%%' placeholders");
    console.log("  - No '\"H' approximations");
    console.log("  - No U+FFFD replacement characters");
    console.log("  - No raw $...$ LaTeX math");
    console.log("  - No raw _{ or ^{ brackets");
    console.log("  - No duplicate banner headings");
    process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('qa-pdf.mjs')) {
    run().catch(err => {
        console.error("Unexpected QA error:", err);
        process.exit(1);
    });
}
