import { describe, it, expect, beforeEach, vi } from "vitest";
import { getStorageItem, setStorageItem, removeStorageItem } from "../src/utils/storage";
import { resetTabSessionForTesting, initTabSession } from "../src/utils/tabSession";
import { createToken } from "../src/utils/auth";
import { syncClientAuthState } from "../src/utils/authClient";

process.env.JWT_SECRET = "ci-build-secret-key-with-at-least-32-chars-test-secret!";

describe("Session Persistence Across Tab Closures and Reopens", () => {
    beforeEach(() => {
        resetTabSessionForTesting();
    });

    it("persists user session when tab is closed and reopened (empty sessionStorage, populated localStorage)", () => {
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
        };

        vi.stubGlobal("window", mockWindow);
        vi.stubGlobal("sessionStorage", mockSessionStorage);
        vi.stubGlobal("localStorage", mockLocalStorage);

        // 1. User signs in on Tab 1
        const testToken = createToken({ identifier: "candidate@prointerview.ai", role: "user", isOrganization: false });
        setStorageItem("userLoggedIn", "true");
        setStorageItem("userName", "Candidate User");
        setStorageItem("userIdentifier", "candidate@prointerview.ai");
        setStorageItem("userRole", "user");
        setStorageItem("sessionToken", testToken);

        // Verify initial login state
        expect(getStorageItem("userLoggedIn")).toBe("true");
        expect(getStorageItem("userName")).toBe("Candidate User");
        expect(getStorageItem("userIdentifier")).toBe("candidate@prointerview.ai");

        // 2. SIMULATE CLOSING THE TAB:
        // When tab is closed, the browser completely destroys sessionStorage and window.name
        mockSessionStorage.clear();
        mockWindow.name = "";
        resetTabSessionForTesting();

        // Verify sessionStorage is completely empty
        expect(mockSessionStorage.getItem("userLoggedIn")).toBeNull();
        expect(mockSessionStorage.getItem("sessionToken")).toBeNull();

        // 3. SIMULATE REOPENING THE SITE IN A NEW TAB:
        initTabSession();
        syncClientAuthState();

        // Verify user remains logged in without requiring re-authentication
        expect(getStorageItem("userLoggedIn")).toBe("true");
        expect(getStorageItem("userName")).toBe("Candidate User");
        expect(getStorageItem("userIdentifier")).toBe("candidate@prointerview.ai");
        expect(getStorageItem("sessionToken")).toBe(testToken);

        // 4. SIMULATE USER LOGOUT:
        removeStorageItem("userLoggedIn");

        expect(getStorageItem("userLoggedIn")).toBeNull();
        expect(mockLocalStorage.getItem("userLoggedIn")).toBeNull();
        expect(mockSessionStorage.getItem("userLoggedIn")).toBeNull();

        vi.unstubAllGlobals();
    });

    it("does not restore session if token is expired", () => {
        const localStorageMap: Record<string, string> = {};
        const sessionStorageMap: Record<string, string> = {};

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
            name: "",
            sessionStorage: mockSessionStorage,
            localStorage: mockLocalStorage,
            dispatchEvent: vi.fn(),
            CustomEvent: class {},
        };

        vi.stubGlobal("window", mockWindow);
        vi.stubGlobal("sessionStorage", mockSessionStorage);
        vi.stubGlobal("localStorage", mockLocalStorage);

        // Set expired session
        const expiredExp = String(Date.now() - 100000);
        mockLocalStorage.setItem("userLoggedIn", "true");
        mockLocalStorage.setItem("userSessionExpiresAt", expiredExp);

        expect(getStorageItem("userLoggedIn")).toBeNull();

        vi.unstubAllGlobals();
    });
});
