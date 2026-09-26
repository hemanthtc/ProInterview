import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Verify that no hardcoded secrets, API keys, or credentials are
 * checked into the source code. Scans all .ts/.tsx/.js/.jsx files
 * under src/ for common patterns.
 */

const SRC_DIR = path.resolve(__dirname, "../src");

// Patterns that indicate hardcoded secrets
const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
    {
        name: "Hardcoded API key assignment",
        regex: /(?:api_?key|apikey|secret_?key|auth_?token)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/i,
    },
    {
        name: "AWS access key",
        regex: /AKIA[0-9A-Z]{16}/,
    },
    {
        name: "MongoDB connection string with credentials",
        regex: /mongodb(\+srv)?:\/\/[^@\s]+:[^@\s]+@[^/\s]+/i,
    },
    {
        name: "Bearer token hardcoded",
        regex: /["']Bearer\s+[A-Za-z0-9_\-\.]{20,}["']/,
    },
    {
        name: "Private key block",
        regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
    },
];

// Files to exclude (test files, config examples, env examples)
const EXCLUDE_PATTERNS = [
    /\.test\./,
    /\.spec\./,
    /\.example/,
    /\.env/,
    /__mocks__/,
    /node_modules/,
];

function getAllSourceFiles(dir: string): string[] {
    const files: string[] = [];
    function walk(d: string) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === "node_modules" || entry.name === ".next") continue;
                walk(full);
            } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                files.push(full);
            }
        }
    }
    walk(dir);
    return files;
}

describe("secrets audit", () => {
    const sourceFiles = getAllSourceFiles(SRC_DIR);

    it("found source files to scan", () => {
        expect(sourceFiles.length).toBeGreaterThan(0);
    });

    for (const pattern of SECRET_PATTERNS) {
        it(`no source files contain ${pattern.name}`, () => {
            const violations: string[] = [];
            for (const file of sourceFiles) {
                const relPath = path.relative(SRC_DIR, file);
                if (EXCLUDE_PATTERNS.some((p) => p.test(relPath))) continue;

                const content = fs.readFileSync(file, "utf-8");
                const lines = content.split("\n");
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Skip comment lines and process.env references
                    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
                    if (line.includes("process.env")) continue;
                    // Skip lines that are just reading from env
                    if (line.match(/=\s*process\.env\./)) continue;

                    if (pattern.regex.test(line)) {
                        violations.push(`${relPath}:${i + 1}: ${line.trim().substring(0, 100)}`);
                    }
                }
            }
            expect(
                violations,
                `Found ${violations.length} potential hardcoded secrets:\n${violations.join("\n")}`
            ).toHaveLength(0);
        });
    }

    it("sensitive env vars are loaded from process.env, not hardcoded", () => {
        const sensitiveVars = [
            "GEMINI_API_KEY",
            "JWT_SECRET",
            "MONGODB_URI",
            "GOOGLE_CLIENT_SECRET",
            "RAZORPAY_KEY_SECRET",
            "SARVAM_API_KEY",
        ];

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, "utf-8");
            for (const varName of sensitiveVars) {
                // If the variable name appears, it should be via process.env
                if (content.includes(varName) && !content.includes(`process.env.${varName}`)) {
                    // It might be in a type, comment, or variable name — that's fine
                    // Only flag if it looks like an assignment with a value
                    const suspiciousPattern = new RegExp(
                        `${varName}\\s*[:=]\\s*["'][^"']{10,}["']`,
                        "i"
                    );
                    expect(
                        suspiciousPattern.test(content),
                        `${path.relative(SRC_DIR, file)} may have hardcoded ${varName}`
                    ).toBe(false);
                }
            }
        }
    });
});
