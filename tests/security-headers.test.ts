import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Verify that the Next.js config applies all required production security headers.
 */

const CONFIG_PATH = path.resolve(__dirname, "../next.config.ts");

describe("security headers in next.config.ts", () => {
    let configContent: string;

    it("next.config.ts exists", () => {
        expect(fs.existsSync(CONFIG_PATH)).toBe(true);
        configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    });

    const requiredHeaders = [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", expected: /camera=\(self/ },
        { key: "Strict-Transport-Security", expected: /max-age=\d+.*includeSubDomains/ },
        { key: "Content-Security-Policy", expected: /default-src/ },
    ];

    for (const header of requiredHeaders) {
        it(`includes ${header.key}`, () => {
            configContent = configContent || fs.readFileSync(CONFIG_PATH, "utf-8");
            expect(configContent).toContain(header.key);
            if ("value" in header && header.value) {
                expect(configContent).toContain(header.value);
            }
            if ("expected" in header && header.expected) {
                expect(configContent).toMatch(header.expected);
            }
        });
    }

    it("CSP blocks object-src", () => {
        configContent = configContent || fs.readFileSync(CONFIG_PATH, "utf-8");
        expect(configContent).toContain("object-src 'none'");
    });

    it("CSP restricts base-uri", () => {
        configContent = configContent || fs.readFileSync(CONFIG_PATH, "utf-8");
        expect(configContent).toContain("base-uri 'self'");
    });

    it("CSP restricts form-action", () => {
        configContent = configContent || fs.readFileSync(CONFIG_PATH, "utf-8");
        expect(configContent).toContain("form-action 'self'");
    });

    it("headers function covers all routes", () => {
        configContent = configContent || fs.readFileSync(CONFIG_PATH, "utf-8");
        expect(configContent).toMatch(/source:\s*["']\//);
    });
});
