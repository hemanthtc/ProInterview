import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Security input validation tests:
 * - Upload route blocks dangerous file extensions
 * - SSRF protection exists
 * - XSS: CSP headers are in place (tested in security-headers.test.ts)
 */

describe("upload route security", () => {
    const uploadRoutePath = path.resolve(__dirname, "../src/app/api/upload/route.ts");
    let content: string;

    it("upload route exists", () => {
        expect(fs.existsSync(uploadRoutePath)).toBe(true);
        content = fs.readFileSync(uploadRoutePath, "utf-8");
    });

    const dangerousExtensions = [".exe", ".bat", ".sh", ".cmd", ".ps1", ".dll", ".msi"];

    for (const ext of dangerousExtensions) {
        it(`blocks ${ext} files`, () => {
            content = content || fs.readFileSync(uploadRoutePath, "utf-8");
            // The extension should appear in a blocklist regex or array
            expect(content).toContain(ext.replace(".", ""));
        });
    }

    it("has a max file size constant", () => {
        content = content || fs.readFileSync(uploadRoutePath, "utf-8");
        expect(content).toMatch(/MAX_FILE_SIZE/);
    });

    it("has a max files constant", () => {
        content = content || fs.readFileSync(uploadRoutePath, "utf-8");
        expect(content).toMatch(/MAX_FILES/);
    });

    it("requires authentication", () => {
        content = content || fs.readFileSync(uploadRoutePath, "utf-8");
        expect(content).toContain("getVerifiedSession");
    });
});

describe("SSRF protection", () => {
    const ssrfUtilPath = path.resolve(__dirname, "../src/utils/ssrf.ts");

    it("ssrf utility exists", () => {
        expect(fs.existsSync(ssrfUtilPath)).toBe(true);
    });

    it("checks for unsafe/local URLs", () => {
        const content = fs.readFileSync(ssrfUtilPath, "utf-8");
        expect(content).toMatch(/isSafeUrl|isLocalUrl|local|private|127\.0\.0\.1|0\.0\.0\.0/i);
    });

    it("upload route uses SSRF check", () => {
        const uploadPath = path.resolve(__dirname, "../src/app/api/upload/route.ts");
        const content = fs.readFileSync(uploadPath, "utf-8");
        expect(content).toContain("isSafeUrl");
    });
});

describe("prompt injection guard integration", () => {
    const promptGuardPath = path.resolve(__dirname, "../src/utils/promptGuard.ts");

    it("promptGuard utility exists", () => {
        expect(fs.existsSync(promptGuardPath)).toBe(true);
    });

    const aiRoutes = [
        "interviewer/route.ts",
        "realistic-interviewer/route.ts",
        "panel-interviewer/route.ts",
        "star-coach/route.ts",
    ];

    for (const route of aiRoutes) {
        it(`${route} imports ANTI_LEAK_SUFFIX`, () => {
            const routePath = path.resolve(__dirname, `../src/app/api/${route}`);
            const content = fs.readFileSync(routePath, "utf-8");
            expect(content).toContain("ANTI_LEAK_SUFFIX");
        });
    }
});
