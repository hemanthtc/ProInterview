import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Static analysis tests verifying that all admin routes enforce proper
 * authentication and authorization (session + admin role check).
 *
 * This catches regressions like SEC-01 (no auth at all), SEC-02 (auth but
 * no role check), and SEC-03 (GET with no auth, POST with no role check).
 */

const ADMIN_API_DIR = path.resolve(__dirname, "../src/app/api/admin");

function getAdminRouteFiles(): { name: string; content: string; filePath: string }[] {
    const results: { name: string; content: string; filePath: string }[] = [];

    function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name === "route.ts" || entry.name === "route.js") {
                results.push({
                    name: path.relative(ADMIN_API_DIR, fullPath),
                    content: fs.readFileSync(fullPath, "utf-8"),
                    filePath: fullPath,
                });
            }
        }
    }

    walk(ADMIN_API_DIR);
    return results;
}

describe("admin route authorization", () => {
    const routes = getAdminRouteFiles();

    it("found admin route files to test", () => {
        expect(routes.length).toBeGreaterThan(0);
    });

    it("all admin routes import getVerifiedSession", () => {
        for (const route of routes) {
            expect(
                route.content.includes("getVerifiedSession"),
                `${route.name} should import getVerifiedSession`
            ).toBe(true);
        }
    });

    describe("POST/PUT/DELETE handlers enforce admin role check", () => {
        const mutatingHandlerRe = /export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)/g;

        for (const route of routes) {
            const matches = [...route.content.matchAll(mutatingHandlerRe)];
            for (const match of matches) {
                const method = match[1];
                it(`${route.name} ${method} checks session.role === "admin"`, () => {
                    // The route must contain a role check: session.role !== "admin"
                    // or the equivalent pattern (some routes use === "admin" in a helper)
                    const hasRoleCheck =
                        route.content.includes('session.role !== "admin"') ||
                        route.content.includes("session.role !== 'admin'") ||
                        route.content.includes('role !== "admin"') ||
                        route.content.includes("role !== 'admin'") ||
                        route.content.includes('session.role === "admin"') ||
                        route.content.includes("session.role === 'admin'") ||
                        route.content.includes('role === "admin"') ||
                        route.content.includes("role === 'admin'");
                    expect(
                        hasRoleCheck,
                        `${route.name} ${method} handler must check session.role === "admin" (or !== "admin")`
                    ).toBe(true);
                });
            }
        }
    });

    describe("SEC-01: clear-all-prep-packs has auth", () => {
        const route = routes.find((r) => r.name.includes("clear-all-prep-packs"));

        it("exists", () => {
            expect(route).toBeDefined();
        });

        it("checks session and role", () => {
            expect(route!.content).toMatch(/getVerifiedSession/);
            const hasAdminCheck =
                route!.content.includes('role !== "admin"') ||
                route!.content.includes("role !== 'admin'");
            expect(hasAdminCheck).toBe(true);
        });
    });

    describe("SEC-02: labs-visibility POST has role check", () => {
        const route = routes.find((r) => r.name.includes("labs-visibility"));

        it("exists", () => {
            expect(route).toBeDefined();
        });

        it("POST checks admin role", () => {
            const hasAdminCheck =
                route!.content.includes('role !== "admin"') ||
                route!.content.includes("role !== 'admin'");
            expect(hasAdminCheck).toBe(true);
        });
    });

    describe("SEC-03: rate-limits GET and POST have proper auth", () => {
        const route = routes.find((r) => r.name.includes("rate-limits"));

        it("exists", () => {
            expect(route).toBeDefined();
        });

        it("GET handler calls getVerifiedSession", () => {
            // Both GET and POST should have getVerifiedSession
            const sessionCalls = (route!.content.match(/getVerifiedSession/g) || []).length;
            // At minimum 2 calls — one per handler
            expect(sessionCalls).toBeGreaterThanOrEqual(2);
        });

        it("checks admin role", () => {
            const hasAdminCheck =
                route!.content.includes('role !== "admin"') ||
                route!.content.includes("role !== 'admin'");
            expect(hasAdminCheck).toBe(true);
        });
    });
});
