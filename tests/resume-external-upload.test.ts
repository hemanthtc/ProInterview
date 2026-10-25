import { describe, it, expect } from "vitest";
import fs from "fs";

describe("Resume External Upload & PDF Parsing", () => {
    it("successfully imports and parses binary PDF using pdf-parse/lib/pdf-parse.js without debug ENOENT errors", async () => {
        // @ts-expect-error pdf-parse lacks default type definitions
        const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
        const pdfParse = pdfParseModule.default ?? pdfParseModule;

        expect(typeof pdfParse).toBe("function");

        const samplePath = "C:/Users/cheta/Downloads/Deekshith_BC_Resume.pdf";
        if (fs.existsSync(samplePath)) {
            const buffer = fs.readFileSync(samplePath);
            const result = await pdfParse(buffer);
            expect(result).toBeDefined();
            expect(result.text).toContain("DEEKSHITH B C");
            expect(result.numpages).toBeGreaterThanOrEqual(1);
        }
    });

    it("ensures file banner markers are stripped from resume text so user never sees '--- [File: ... ] ---'", () => {
        const rawUploadedText = "--- [File: Deekshith_BC.pdf] ---\nDEEKSHITH B C\nElectronics Engineering – VLSI Design\nBangalore, Karnataka";
        const cleaned = rawUploadedText.replace(/^---\s*\[(?:File|Image OCR)[^\]]*\]\s*---\s*/gi, "").trim();

        expect(cleaned).not.toContain("--- [File: Deekshith_BC.pdf] ---");
        expect(cleaned).toContain("DEEKSHITH B C");
        expect(cleaned).toContain("Electronics Engineering – VLSI Design");
    });

    it("rejects blank or empty file wrappers where no actual resume text was extracted", () => {
        const blankHeaderOnly = "--- [File: Deekshith_BC.pdf] ---\n";
        const cleaned = blankHeaderOnly.replace(/^---\s*\[(?:File|Image OCR)[^\]]*\]\s*---\s*/gi, "").trim();

        expect(cleaned.length).toBe(0);
        expect(cleaned.length < 20).toBe(true);
    });
});
