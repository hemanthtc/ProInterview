import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanExpiredLocalProgress } from "../src/utils/progressCleanup";
import { setStorageItem, getStorageItem } from "../src/utils/storage";

describe("Progress & Learning Auto-Cleanup Engine", () => {
    const mockStorage: Record<string, string> = {};

    beforeEach(() => {
        for (const key of Object.keys(mockStorage)) {
            delete mockStorage[key];
        }

        // Mock window and localStorage
        vi.stubGlobal("window", {
            dispatchEvent: vi.fn(),
            CustomEvent: class {},
        });
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, val: string) => {
                mockStorage[key] = val;
            },
            removeItem: (key: string) => {
                delete mockStorage[key];
            },
            get length() {
                return Object.keys(mockStorage).length;
            },
            key: (i: number) => Object.keys(mockStorage)[i] || null,
        });

        setStorageItem("userLoggedIn", "true");
    });

    it("prunes interview sessions older than 30 days and retains recent ones", () => {
        const now = Date.now();
        const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;
        const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;

        const sessions = [
            { id: "old_sess", timestamp: thirtyOneDaysAgo, role: "Frontend Dev", finalScore: 85 },
            { id: "new_sess", timestamp: fiveDaysAgo, role: "Fullstack Dev", finalScore: 90 },
        ];

        setStorageItem("interviewSessions", JSON.stringify(sessions));
        setStorageItem(`filmRoom_${thirtyOneDaysAgo}`, JSON.stringify({ tape: "expired" }));
        setStorageItem(`filmRoom_${fiveDaysAgo}`, JSON.stringify({ tape: "valid" }));

        cleanExpiredLocalProgress(30);

        const remainingSessions = JSON.parse(getStorageItem("interviewSessions") || "[]");
        expect(remainingSessions.length).toBe(1);
        expect(remainingSessions[0].id).toBe("new_sess");

        // Expired film room cache should be removed, active one retained
        expect(getStorageItem(`filmRoom_${thirtyOneDaysAgo}`)).toBeNull();
        expect(getStorageItem(`filmRoom_${fiveDaysAgo}`)).toBeDefined();
    });

    it("prunes mock aptitude assessments older than 30 days", () => {
        const now = Date.now();
        const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000;
        const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

        const mockTests = [
            { id: "mock_old", timestamp: fortyDaysAgo, score: 70 },
            { id: "mock_new", timestamp: twoDaysAgo, score: 95 },
        ];

        setStorageItem("mockAptitudeSessions", JSON.stringify(mockTests));

        cleanExpiredLocalProgress(30);

        const remainingMocks = JSON.parse(getStorageItem("mockAptitudeSessions") || "[]");
        expect(remainingMocks.length).toBe(1);
        expect(remainingMocks[0].id).toBe("mock_new");
    });

    it("handles corrupt or empty storage gracefully without throwing", () => {
        setStorageItem("interviewSessions", "{invalid json");
        setStorageItem("mockAptitudeSessions", "null");

        expect(() => cleanExpiredLocalProgress(30)).not.toThrow();
    });
});

