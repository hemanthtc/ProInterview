import { describe, it, expect } from "vitest";
import { FLUENCY_WORDS, PHRASE_UPGRADES, SHADOW_SENTENCES } from "../src/data/englishFluency";
import {
    dailyWords,
    fluencyTabLabel,
    polishEnglishOffline,
    quizOptions,
    tokenOverlapScore,
} from "../src/utils/englishFluency";

describe("english fluency bank", () => {
    it("has unique word ids and four quiz options", () => {
        const ids = FLUENCY_WORDS.map((w) => w.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(FLUENCY_WORDS.length).toBeGreaterThanOrEqual(20);
        for (const w of FLUENCY_WORDS) {
            const opts = quizOptions(w);
            expect(opts).toHaveLength(4);
            expect(opts).toContain(w.meaning);
        }
    });

    it("picks a stable daily set", () => {
        const a = dailyWords(3, Date.UTC(2026, 7, 30));
        const b = dailyWords(3, Date.UTC(2026, 7, 30));
        expect(a.map((w) => w.id)).toEqual(b.map((w) => w.id));
        expect(a).toHaveLength(3);
    });

    it("scores shadow speech by token overlap", () => {
        const target = SHADOW_SENTENCES[0];
        expect(tokenOverlapScore(target, target)).toBe(100);
        expect(tokenOverlapScore("hello", target)).toBeLessThan(40);
    });

    it("upgrades common campus English phrases offline", () => {
        const out = polishEnglishOffline("I am having two years experience and I did the needful.");
        expect(out.polished.toLowerCase()).toContain("i have");
        expect(out.polished.toLowerCase()).not.toContain("did the needful");
        expect(out.applied.length).toBeGreaterThan(0);
    });

    it("labels every tab exhaustively", () => {
        expect(fluencyTabLabel("words")).toMatch(/word/i);
        expect(fluencyTabLabel("speak")).toMatch(/speak/i);
        expect(fluencyTabLabel("fluency")).toMatch(/fluency/i);
        expect(fluencyTabLabel("polish")).toMatch(/english/i);
        expect(PHRASE_UPGRADES.length).toBeGreaterThan(8);
    });
});
