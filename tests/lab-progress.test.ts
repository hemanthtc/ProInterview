import { describe, it, expect, beforeEach } from "vitest";
import {
    loadStarHistory,
    saveStarHistoryEntry,
    loadCodingProgress,
    saveCodingProgress,
} from "../src/utils/labProgress";

const memory: Record<string, string> = {};

beforeEach(() => {
    Object.keys(memory).forEach((k) => delete memory[k]);
    // Minimal localStorage shim for node/vitest
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
            getItem: (k: string) => memory[k] ?? null,
            setItem: (k: string, v: string) => {
                memory[k] = v;
            },
            removeItem: (k: string) => {
                delete memory[k];
            },
            clear: () => {
                Object.keys(memory).forEach((k) => delete memory[k]);
            },
            key: () => null,
            length: 0,
        },
    });
    memory.userLoggedIn = "true";
    memory.userIdentifier = "test-user";
});

describe("lab progress helpers", () => {
    it("keeps at most 5 STAR stories", () => {
        for (let i = 0; i < 7; i++) {
            saveStarHistoryEntry({
                question: `Q${i}`,
                story: `Story ${i}`,
                weakSpot: "metrics",
                score: 50 + i,
            });
        }
        expect(loadStarHistory()).toHaveLength(5);
        expect(loadStarHistory()[0].question).toBe("Q6");
    });

    it("tracks coding best scores and unlocks at 70+", () => {
        saveCodingProgress({ problemId: "two-sum", score: 40 });
        expect(loadCodingProgress().solvedIds).not.toContain("two-sum");
        saveCodingProgress({ problemId: "two-sum", score: 80 });
        const p = loadCodingProgress();
        expect(p.bestScores["two-sum"]).toBe(80);
        expect(p.solvedIds).toContain("two-sum");
    });
});
