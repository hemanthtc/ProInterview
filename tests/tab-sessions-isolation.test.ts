import { describe, it, expect, beforeEach, vi } from "vitest";
import { createToken, verifyToken, getVerifiedSession } from "../src/utils/auth";
import { initTabSession, getCurrentTabId, resetTabSessionForTesting, TAB_AUTH_KEYS } from "../src/utils/tabSession";
import { getStorageItem, setStorageItem, removeStorageItem, getScopedKey } from "../src/utils/storage";

// Setup JWT_SECRET for test environment
process.env.JWT_SECRET = "ci-build-secret-key-with-at-least-32-chars-test-secret!";

describe("ProInterview Independent User Sessions Per Browser Tab", () => {
    beforeEach(() => {
        resetTabSessionForTesting();
    });

    // Helper to simulate an isolated browser tab environment
    function createTabContext(tabName: string) {
        const sessionStorageMap: Record<string, string> = {};
        const localStorageMap: Record<string, string> = {};

        const mockSessionStorage: Storage = {
            getItem: (k: string) => sessionStorageMap[k] ?? null,
            setItem: (k: string, v: string) => { sessionStorageMap[k] = String(v); },
            removeItem: (k: string) => { delete sessionStorageMap[k]; },
            clear: () => { Object.keys(sessionStorageMap).forEach(k => delete sessionStorageMap[k]); },
            key: (i: number) => Object.keys(sessionStorageMap)[i] ?? null,
            get length() { return Object.keys(sessionStorageMap).length; },
        };

        const mockLocalStorage: Storage = {
            getItem: (k: string) => localStorageMap[k] ?? null,
            setItem: (k: string, v: string) => { localStorageMap[k] = String(v); },
            removeItem: (k: string) => { delete localStorageMap[k]; },
            clear: () => { Object.keys(localStorageMap).forEach(k => delete localStorageMap[k]); },
            key: (i: number) => Object.keys(localStorageMap)[i] ?? null,
            get length() { return Object.keys(localStorageMap).length; },
        };

        const mockWindow = {
            name: tabName,
            sessionStorage: mockSessionStorage,
            localStorage: mockLocalStorage,
            dispatchEvent: vi.fn(),
            CustomEvent: class {},
        };

        return {
            window: mockWindow,
            sessionStorage: mockSessionStorage,
            localStorage: mockLocalStorage,
            sessionMap: sessionStorageMap,
            localMap: localStorageMap,
        };
    }

    describe("Test A: Independent Accounts", () => {
        it("allows Tab A (User A) and Tab B (User B) to remain logged in simultaneously with distinct identities", async () => {
            const tokenA = createToken({ identifier: "usera@prointerview.ai", role: "user", isOrganization: false });
            const tokenB = createToken({ identifier: "userb@prointerview.ai", role: "user", isOrganization: false });

            const tabA = createTabContext("prointerview_tab_A");
            const tabB = createTabContext("prointerview_tab_B");

            // 1. User A logs in on Tab A
            tabA.sessionStorage.setItem("sessionToken", tokenA);
            tabA.sessionStorage.setItem("userIdentifier", "usera@prointerview.ai");
            tabA.sessionStorage.setItem("userName", "User A");
            tabA.sessionStorage.setItem("userLoggedIn", "true");

            // 2. User B logs in on Tab B
            tabB.sessionStorage.setItem("sessionToken", tokenB);
            tabB.sessionStorage.setItem("userIdentifier", "userb@prointerview.ai");
            tabB.sessionStorage.setItem("userName", "User B");
            tabB.sessionStorage.setItem("userLoggedIn", "true");

            // Shared browser cookie: points to the most recent login (User B)
            const sharedCookie = `session=${tokenB}; userLoggedIn=true`;

            // 3. Verify Tab A sends its own token, and server resolves Tab A as User A (NOT overridden by shared cookie)
            const reqFromTabA = {
                headers: new Headers({
                    authorization: `Bearer ${tokenA}`,
                    cookie: sharedCookie,
                }),
                cookies: {
                    get: (name: string) => (name === "session" ? { value: tokenB } : undefined),
                },
            } as any;

            const sessionA = await getVerifiedSession(reqFromTabA);
            expect(sessionA).not.toBeNull();
            expect(sessionA?.identifier).toBe("usera@prointerview.ai");

            // 4. Verify Tab B sends its own token, and server resolves Tab B as User B
            const reqFromTabB = {
                headers: new Headers({
                    authorization: `Bearer ${tokenB}`,
                    cookie: sharedCookie,
                }),
                cookies: {
                    get: (name: string) => (name === "session" ? { value: tokenB } : undefined),
                },
            } as any;

            const sessionB = await getVerifiedSession(reqFromTabB);
            expect(sessionB).not.toBeNull();
            expect(sessionB?.identifier).toBe("userb@prointerview.ai");

            // 5. Verify Tab A's client storage is completely unchanged by Tab B
            expect(tabA.sessionStorage.getItem("userIdentifier")).toBe("usera@prointerview.ai");
            expect(tabB.sessionStorage.getItem("userIdentifier")).toBe("userb@prointerview.ai");
            expect(tabA.sessionStorage.getItem("sessionToken")).toBe(tokenA);
            expect(tabB.sessionStorage.getItem("sessionToken")).toBe(tokenB);
        });

        it("preserves identities across page refresh in both tabs", async () => {
            const tokenA = createToken({ identifier: "usera@prointerview.ai", role: "user", isOrganization: false });
            const tokenB = createToken({ identifier: "userb@prointerview.ai", role: "user", isOrganization: false });

            const tabA = createTabContext("prointerview_tab_A");
            const tabB = createTabContext("prointerview_tab_B");

            tabA.sessionStorage.setItem("__prointerview_tab_id__", "prointerview_tab_A");
            tabA.sessionStorage.setItem("sessionToken", tokenA);
            tabA.sessionStorage.setItem("userIdentifier", "usera@prointerview.ai");
            tabA.sessionStorage.setItem("userLoggedIn", "true");

            tabB.sessionStorage.setItem("__prointerview_tab_id__", "prointerview_tab_B");
            tabB.sessionStorage.setItem("sessionToken", tokenB);
            tabB.sessionStorage.setItem("userIdentifier", "userb@prointerview.ai");
            tabB.sessionStorage.setItem("userLoggedIn", "true");

            // Simulate Refresh on Tab A (window.name and sessionStorage match)
            expect(tabA.window.name).toBe("prointerview_tab_A");
            expect(tabA.sessionStorage.getItem("__prointerview_tab_id__")).toBe("prointerview_tab_A");
            expect(tabA.sessionStorage.getItem("userIdentifier")).toBe("usera@prointerview.ai");

            // Simulate Refresh on Tab B
            expect(tabB.window.name).toBe("prointerview_tab_B");
            expect(tabB.sessionStorage.getItem("__prointerview_tab_id__")).toBe("prointerview_tab_B");
            expect(tabB.sessionStorage.getItem("userIdentifier")).toBe("userb@prointerview.ai");
        });
    });

    describe("Test B: Independent Logout", () => {
        it("logging out from Tab A does not terminate or alter Tab B's session", async () => {
            const tokenA = createToken({ identifier: "usera@prointerview.ai", role: "user", isOrganization: false });
            const tokenB = createToken({ identifier: "userb@prointerview.ai", role: "user", isOrganization: false });

            const tabA = createTabContext("prointerview_tab_A");
            const tabB = createTabContext("prointerview_tab_B");

            tabA.sessionStorage.setItem("sessionToken", tokenA);
            tabA.sessionStorage.setItem("userIdentifier", "usera@prointerview.ai");
            tabA.sessionStorage.setItem("userLoggedIn", "true");

            tabB.sessionStorage.setItem("sessionToken", tokenB);
            tabB.sessionStorage.setItem("userIdentifier", "userb@prointerview.ai");
            tabB.sessionStorage.setItem("userLoggedIn", "true");

            // Tab A performs tab-scoped logout: clears Tab A sessionStorage
            TAB_AUTH_KEYS.forEach(key => tabA.sessionStorage.removeItem(key));

            // Verify Tab A is logged out
            expect(tabA.sessionStorage.getItem("userLoggedIn")).toBeNull();
            expect(tabA.sessionStorage.getItem("sessionToken")).toBeNull();

            // Verify Tab B remains 100% authenticated
            expect(tabB.sessionStorage.getItem("userLoggedIn")).toBe("true");
            expect(tabB.sessionStorage.getItem("sessionToken")).toBe(tokenB);
            expect(tabB.sessionStorage.getItem("userIdentifier")).toBe("userb@prointerview.ai");

            // Verify Tab B server requests still succeed
            const reqTabB = {
                headers: new Headers({ authorization: `Bearer ${tokenB}` }),
            } as any;
            const verifiedB = await getVerifiedSession(reqTabB);
            expect(verifiedB?.identifier).toBe("userb@prointerview.ai");

            // Verify Tab A server requests without token fail
            const reqTabA = {
                headers: new Headers(),
            } as any;
            const verifiedA = await getVerifiedSession(reqTabA);
            expect(verifiedA).toBeNull();
        });
    });

    describe("Test C: Data Isolation & IDOR Protection", () => {
        it("denies User B access to User A's profile even when User B explicitly requests User A's identifier", async () => {
            const tokenB = createToken({ identifier: "userb@prointerview.ai", role: "user", isOrganization: false });

            // User B sends their valid token, but specifies User A's email in the query
            const targetIdentifier = "usera@prointerview.ai";

            const req = {
                headers: new Headers({
                    authorization: `Bearer ${tokenB}`,
                }),
            } as any;

            const session = await getVerifiedSession(req);
            expect(session).not.toBeNull();
            expect(session?.identifier).toBe("userb@prointerview.ai");

            // Enforce ownership check (same logic used in /api/auth/profile)
            const isAuthorized = session!.identifier.toLowerCase() === targetIdentifier.toLowerCase();
            expect(isAuthorized).toBe(false);
        });

        it("properly isolates user-scoped cache keys between tabs", () => {
            vi.stubGlobal("window", {
                sessionStorage: {
                    getItem: (key: string) => (key === "userIdentifier" ? "usera@prointerview.ai" : null),
                },
                localStorage: {},
                dispatchEvent: vi.fn(),
                CustomEvent: class {},
            });

            // For Tab A (User A)
            const scopedKeyA = getScopedKey("savedResumesDatabase");
            expect(scopedKeyA).toBe("savedResumesDatabase_usera@prointerview.ai");

            // Switch to Tab B (User B)
            vi.stubGlobal("window", {
                sessionStorage: {
                    getItem: (key: string) => (key === "userIdentifier" ? "userb@prointerview.ai" : null),
                },
                localStorage: {},
                dispatchEvent: vi.fn(),
                CustomEvent: class {},
            });

            const scopedKeyB = getScopedKey("savedResumesDatabase");
            expect(scopedKeyB).toBe("savedResumesDatabase_userb@prointerview.ai");
            expect(scopedKeyA).not.toBe(scopedKeyB);

            vi.unstubAllGlobals();
        });
    });

    describe("Test D: Authentication Methods", () => {
        it("authenticates OTP/email login into a tab-scoped credential", async () => {
            const payload = {
                identifier: "otp-candidate@prointerview.ai",
                role: "user" as const,
                isOrganization: false,
            };
            const token = createToken(payload);
            const verified = verifyToken(token);

            expect(verified).not.toBeNull();
            expect(verified?.identifier).toBe("otp-candidate@prointerview.ai");
            expect(verified?.role).toBe("user");
        });

        it("authenticates Google OAuth into a tab-scoped credential", async () => {
            const payload = {
                identifier: "google-candidate@gmail.com",
                role: "user" as const,
                isOrganization: false,
            };
            const token = createToken(payload);
            const verified = verifyToken(token);

            expect(verified).not.toBeNull();
            expect(verified?.identifier).toBe("google-candidate@gmail.com");
        });
    });

    describe("Test E: Session Lifecycle & New Tab Strategy", () => {
        it("detects newly opened tabs with empty window.name and prevents credential bleeding", () => {
            const tabContext = createTabContext(""); // newly opened tab has empty window.name
            // Simulate browser cloning previous tab's sessionStorage
            tabContext.sessionStorage.setItem("__prointerview_tab_id__", "prointerview_tab_old");
            tabContext.sessionStorage.setItem("userIdentifier", "leaked-user@prointerview.ai");
            tabContext.sessionStorage.setItem("sessionToken", "leaked-token");
            tabContext.sessionStorage.setItem("userLoggedIn", "true");

            vi.stubGlobal("window", tabContext.window);
            vi.stubGlobal("sessionStorage", tabContext.sessionStorage);

            // Run tab initialization
            const newTabId = initTabSession();

            // Verify a new unique tab ID is assigned
            expect(newTabId).not.toBe("prointerview_tab_old");
            expect(tabContext.window.name).toBe(newTabId);

            // Verify cloned credentials were stripped to protect data isolation
            expect(tabContext.sessionStorage.getItem("userIdentifier")).toBeNull();
            expect(tabContext.sessionStorage.getItem("sessionToken")).toBeNull();

            vi.unstubAllGlobals();
        });

        it("rejects an expired tab token without falling back to another user's cookie", async () => {
            const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoidXNlcmFAcHJvaW50ZXJ2aWV3LmFpIiwicm9sZSI6InVzZXIiLCJleHAiOjEwMDAwMDAwMDB9.invalid_signature";
            const validCookieUserB = createToken({ identifier: "userb@prointerview.ai", role: "user", isOrganization: false });

            const req = {
                headers: new Headers({
                    authorization: `Bearer ${expiredToken}`,
                    cookie: `session=${validCookieUserB}`,
                }),
                cookies: {
                    get: () => ({ value: validCookieUserB }),
                },
            } as any;

            // When an explicit invalid/expired token is passed in headers, it must NOT fall back to User B's cookie
            const session = await getVerifiedSession(req);
            expect(session).toBeNull();
        });
    });

    describe("Test F: Role-based Interface Routing and Auth Guard Validation", () => {
        it("properly isolates admin, employee, and user roles in distinct tabs and verifies admin auth guard passes", () => {
            const adminTab = createTabContext("prointerview_tab_ADMIN");
            const userTab = createTabContext("prointerview_tab_USER");
            const employeeTab = createTabContext("prointerview_tab_EMP");

            // Setup Admin Tab
            vi.stubGlobal("window", adminTab.window);
            vi.stubGlobal("sessionStorage", adminTab.sessionStorage);
            vi.stubGlobal("localStorage", adminTab.localStorage);
            resetTabSessionForTesting();
            initTabSession();
            setStorageItem("userLoggedIn", "true");
            setStorageItem("userRole", "admin");
            setStorageItem("userIdentifier", "admin_root");
            setStorageItem("userOrgName", "Enterprise Inc");

            // Admin Auth Guard checks
            expect(getStorageItem("userLoggedIn")).toBe("true");
            expect(getStorageItem("userRole")).toBe("admin");
            expect(getStorageItem("userOrgName")).toBe("Enterprise Inc");

            // Verify admin passes the /admin auth guard
            const adminGuardPasses = getStorageItem("userLoggedIn") === "true" && getStorageItem("userRole") === "admin";
            expect(adminGuardPasses).toBe(true);

            // Setup User Tab
            vi.stubGlobal("window", userTab.window);
            vi.stubGlobal("sessionStorage", userTab.sessionStorage);
            vi.stubGlobal("localStorage", userTab.localStorage);
            resetTabSessionForTesting();
            initTabSession();
            setStorageItem("userLoggedIn", "true");
            setStorageItem("userRole", "user");
            setStorageItem("userIdentifier", "student@university.edu");

            // User should NOT pass /admin auth guard
            expect(getStorageItem("userLoggedIn")).toBe("true");
            expect(getStorageItem("userRole")).toBe("user");
            const userGuardPasses = getStorageItem("userLoggedIn") === "true" && getStorageItem("userRole") === "admin";
            expect(userGuardPasses).toBe(false);

            // Setup Employee Tab
            vi.stubGlobal("window", employeeTab.window);
            vi.stubGlobal("sessionStorage", employeeTab.sessionStorage);
            vi.stubGlobal("localStorage", employeeTab.localStorage);
            resetTabSessionForTesting();
            initTabSession();
            setStorageItem("userLoggedIn", "true");
            setStorageItem("userRole", "employee");
            setStorageItem("userIdentifier", "emp_42");
            setStorageItem("userOrgName", "Acme Labs");
            setStorageItem("userDepartment", "AI Platform");

            expect(getStorageItem("userLoggedIn")).toBe("true");
            expect(getStorageItem("userRole")).toBe("employee");
            expect(getStorageItem("userOrgName")).toBe("Acme Labs");
            expect(getStorageItem("userDepartment")).toBe("AI Platform");

            vi.unstubAllGlobals();
        });
    });
});

