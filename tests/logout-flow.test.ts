import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../src/app/api/auth/logout/route";
import { createToken } from "../src/utils/auth";
import { clearAllAuthSession, logoutUser, syncClientAuthState } from "../src/utils/authClient";
import { setStorageItem, getStorageItem } from "../src/utils/storage";
import { resetTabSessionForTesting } from "../src/utils/tabSession";
import { NextRequest } from "next/server";

process.env.JWT_SECRET = "ci-build-secret-key-with-at-least-32-chars-test-secret!";

describe("Logout Flow & Session Invalidation", () => {
    beforeEach(() => {
        resetTabSessionForTesting();
        vi.restoreAllMocks();
    });

    describe("POST /api/auth/logout endpoint", () => {
        it("clears session and userLoggedIn cookies when called with empty body (default logout)", async () => {
            const token = createToken({ identifier: "candidate@prointerview.ai", role: "user", isOrganization: false });
            const req = new NextRequest("http://localhost:3000/api/auth/logout", {
                method: "POST",
                headers: {
                    cookie: `session=${token}; userLoggedIn=true`,
                },
            });

            const res = await POST(req);
            expect(res.status).toBe(200);

            const sessionCookie = res.cookies.get("session");
            const userLoggedInCookie = res.cookies.get("userLoggedIn");

            expect(sessionCookie).toBeDefined();
            expect(sessionCookie?.value).toBe("");
            expect(sessionCookie?.maxAge).toBe(0);

            expect(userLoggedInCookie).toBeDefined();
            expect(userLoggedInCookie?.value).toBe("");
            expect(userLoggedInCookie?.maxAge).toBe(0);
        });

        it("clears cookies when global=true is explicitly requested", async () => {
            const token = createToken({ identifier: "candidate@prointerview.ai", role: "user", isOrganization: false });
            const req = new NextRequest("http://localhost:3000/api/auth/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    cookie: `session=${token}; userLoggedIn=true`,
                },
                body: JSON.stringify({ identifier: "candidate@prointerview.ai", global: true, tabOnly: false }),
            });

            const res = await POST(req);
            expect(res.status).toBe(200);

            const sessionCookie = res.cookies.get("session");
            expect(sessionCookie?.value).toBe("");
            expect(sessionCookie?.maxAge).toBe(0);
        });

        it("clears cookies during tab-scoped logout if the domain cookie belongs to the logging out user", async () => {
            const token = createToken({ identifier: "user1@prointerview.ai", role: "user", isOrganization: false });
            const req = new NextRequest("http://localhost:3000/api/auth/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    cookie: `session=${token}; userLoggedIn=true`,
                },
                body: JSON.stringify({ identifier: "user1@prointerview.ai", global: false, tabOnly: true }),
            });

            const res = await POST(req);
            expect(res.status).toBe(200);

            const sessionCookie = res.cookies.get("session");
            expect(sessionCookie?.value).toBe("");
            expect(sessionCookie?.maxAge).toBe(0);
        });

        it("preserves the domain cookie during tab-scoped logout IF the cookie belongs to a different user", async () => {
            const tokenOtherUser = createToken({ identifier: "otheruser@prointerview.ai", role: "user", isOrganization: false });
            const req = new NextRequest("http://localhost:3000/api/auth/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    cookie: `session=${tokenOtherUser}; userLoggedIn=true`,
                },
                body: JSON.stringify({ identifier: "myuser@prointerview.ai", global: false, tabOnly: true }),
            });

            const res = await POST(req);
            expect(res.status).toBe(200);

            // Cookie belonged to otheruser, so tab-scoped logout for myuser must NOT clear it
            const sessionCookie = res.cookies.get("session");
            expect(sessionCookie).toBeUndefined();
        });
    });

    describe("Client-side logout and state clearing", () => {
        it("clearAllAuthSession clears sessionStorage, localStorage, and client cookies", () => {
            const sessionStorageMap: Record<string, string> = {};
            const localStorageMap: Record<string, string> = {};
            let documentCookie = "userLoggedIn=true; session=abc.def.ghi";

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
                name: "prointerview_tab_1",
                sessionStorage: mockSessionStorage,
                localStorage: mockLocalStorage,
                dispatchEvent: vi.fn(),
                CustomEvent: class {},
                location: { href: "/" },
            };

            const mockDocument = {
                get cookie() { return documentCookie; },
                set cookie(val: string) {
                    if (val.includes("max-age=0") || val.includes("expires=Thu, 01 Jan 1970")) {
                        const name = val.split("=")[0].trim();
                        // Expire / remove cookie
                        documentCookie = documentCookie
                            .split(";")
                            .map(c => c.trim())
                            .filter(c => !c.startsWith(`${name}=`))
                            .join("; ");
                    } else {
                        documentCookie = val;
                    }
                },
            };

            vi.stubGlobal("window", mockWindow);
            vi.stubGlobal("document", mockDocument);
            vi.stubGlobal("sessionStorage", mockSessionStorage);
            vi.stubGlobal("localStorage", mockLocalStorage);

            // Populate auth state
            setStorageItem("userLoggedIn", "true");
            setStorageItem("userIdentifier", "tester@prointerview.ai");
            setStorageItem("sessionToken", "test-token-value");
            sessionStorageMap["userLoggedIn"] = "true";
            sessionStorageMap["sessionToken"] = "test-token-value";

            expect(getStorageItem("userLoggedIn")).toBe("true");

            // Perform clearAllAuthSession
            clearAllAuthSession();

            // Verify storage is empty
            expect(mockSessionStorage.getItem("userLoggedIn")).toBeNull();
            expect(mockSessionStorage.getItem("sessionToken")).toBeNull();
            expect(mockLocalStorage.getItem("userLoggedIn")).toBeNull();
            expect(mockLocalStorage.getItem("sessionToken")).toBeNull();
            expect(getStorageItem("userLoggedIn")).toBeNull();

            // Verify cookies were expired
            expect(mockDocument.cookie.includes("userLoggedIn=true")).toBe(false);
            expect(mockDocument.cookie.includes("session=abc.def.ghi")).toBe(false);

            vi.unstubAllGlobals();
        });

        it("syncClientAuthState does not rehydrate from cleared or empty cookies", async () => {
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
                name: "prointerview_tab_1",
                sessionStorage: mockSessionStorage,
                localStorage: mockLocalStorage,
                dispatchEvent: vi.fn(),
                CustomEvent: class {},
                fetch: vi.fn(),
            };

            // document.cookie has only empty/expired remnants or unrelated cookies
            const mockDocument = {
                cookie: "theme=dark",
            };

            vi.stubGlobal("window", mockWindow);
            vi.stubGlobal("document", mockDocument);
            vi.stubGlobal("sessionStorage", mockSessionStorage);
            vi.stubGlobal("localStorage", mockLocalStorage);

            syncClientAuthState();

            // Should NOT call fetch to /api/auth/me
            expect(mockWindow.fetch).not.toHaveBeenCalled();
            expect(getStorageItem("userLoggedIn")).toBeNull();

            vi.unstubAllGlobals();
        });
    });
});

