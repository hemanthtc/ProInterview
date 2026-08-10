import { describe, it, expect } from "vitest";
import {
    mergePrepProgress,
    ensurePrepProgressShape,
    getPlanLimits,
    mergeStarHistory,
    emptyPrepProgress,
} from "../src/utils/usageMeter";

describe("ensurePrepProgressShape", () => {
    it("returns a default shape for null/undefined input", () => {
        const shape = ensurePrepProgressShape(null);
        expect(shape.starHistory).toEqual([]);
        expect(shape.codingProgress).toEqual({ solvedIds: [], bestScores: {} });
        expect(shape.referralCredits).toBe(0);
        expect(shape.usage?.geminiCalls).toBe(0);
    });

    it("coerces malformed fields into the expected shape", () => {
        const shape = ensurePrepProgressShape({
            starHistory: "not-an-array" as unknown as unknown[],
            codingProgress: { solvedIds: "nope" as unknown as string[], bestScores: null as unknown as Record<string, number> },
            referralCredits: "5" as unknown as number,
            usage: {
                geminiCalls: "3" as unknown as number,
                sarvamCalls: undefined as unknown as number,
                coachBookings: 2,
                periodStart: 0,
            },
        });
        expect(shape.starHistory).toEqual([]);
        expect(shape.codingProgress.solvedIds).toEqual([]);
        expect(shape.codingProgress.bestScores).toEqual({});
        expect(shape.referralCredits).toBe(5);
        expect(shape.usage?.geminiCalls).toBe(3);
        expect(shape.usage?.sarvamCalls).toBe(0);
        expect(shape.usage?.coachBookings).toBe(2);
    });

    it("passes through well-formed data unchanged", () => {
        const incoming = {
            starHistory: [{ id: "a" }],
            codingProgress: { solvedIds: ["two-sum"], bestScores: { "two-sum": 80 } },
            referralCredits: 3,
            atsMatchPercent: 72,
            atsLastAt: 100,
            domainPackId: "ml",
            usage: { geminiCalls: 4, sarvamCalls: 1, coachBookings: 0, periodStart: 123 },
        };
        const shape = ensurePrepProgressShape(incoming);
        expect(shape.starHistory).toEqual(incoming.starHistory);
        expect(shape.codingProgress.solvedIds).toEqual(["two-sum"]);
        expect(shape.atsMatchPercent).toBe(72);
        expect(shape.domainPackId).toBe("ml");
        expect(shape.usage).toEqual(incoming.usage);
    });
});

describe("getPlanLimits", () => {
    it("gives Free Tier conservative limits", () => {
        const limits = getPlanLimits("Free Tier");
        expect(limits.gemini).toBe(80);
        expect(limits.sarvam).toBe(40);
        expect(limits.coach).toBe(2);
        expect(limits.unlimitedMocks).toBe(false);
        expect(limits.coachesUnlocked).toBe(false);
    });

    it("unlocks higher limits for Pro/Elite/Enterprise plans", () => {
        for (const plan of ["Pro", "Elite Plan", "Enterprise Tier"]) {
            const limits = getPlanLimits(plan);
            expect(limits.gemini).toBe(500);
            expect(limits.sarvam).toBe(200);
            expect(limits.coach).toBe(20);
            expect(limits.unlimitedMocks).toBe(true);
            expect(limits.coachesUnlocked).toBe(true);
        }
    });

    it("defaults to Free Tier limits when plan is omitted", () => {
        expect(getPlanLimits()).toEqual(getPlanLimits("Free Tier"));
    });
});

describe("mergeStarHistory", () => {
    it("dedupes by id, keeping the most recently saved entry", () => {
        const cloud = [{ id: "s1", question: "Q1", savedAt: 100 }];
        const local = [{ id: "s1", question: "Q1", savedAt: 200 }];
        const merged = mergeStarHistory(cloud, local);
        expect(merged).toHaveLength(1);
        expect((merged[0] as Record<string, unknown>).savedAt).toBe(200);
    });

    it("sorts by savedAt descending and caps at max", () => {
        const cloud = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, savedAt: i }));
        const local = Array.from({ length: 4 }, (_, i) => ({ id: `l${i}`, savedAt: i + 10 }));
        const merged = mergeStarHistory(cloud, local, 5);
        expect(merged).toHaveLength(5);
        expect((merged[0] as Record<string, unknown>).savedAt).toBe(13);
        expect((merged[4] as Record<string, unknown>).savedAt).toBe(3);
    });

    it("ignores malformed entries", () => {
        const merged = mergeStarHistory([null, "bad", { id: "ok", savedAt: 1 }] as unknown[], []);
        expect(merged).toHaveLength(1);
    });

    it("falls back to question+savedAt as key when id is missing", () => {
        const merged = mergeStarHistory(
            [{ question: "Tell me about a time", savedAt: 5 }],
            [{ question: "Tell me about a time", savedAt: 5 }]
        );
        expect(merged).toHaveLength(1);
    });
});

describe("mergePrepProgress", () => {
    it("merges star history, coding progress, and usage from cloud + local", () => {
        const cloud = ensurePrepProgressShape({
            starHistory: [{ id: "s1", savedAt: 1 }],
            codingProgress: { solvedIds: ["two-sum"], bestScores: { "two-sum": 60 } },
            referralCredits: 2,
            usage: { geminiCalls: 10, sarvamCalls: 2, coachBookings: 1, periodStart: 1000 },
        });
        const local = ensurePrepProgressShape({
            starHistory: [{ id: "s2", savedAt: 2 }],
            codingProgress: { solvedIds: ["reverse-string"], bestScores: { "two-sum": 90 } },
            referralCredits: 5,
            usage: { geminiCalls: 3, sarvamCalls: 8, coachBookings: 0, periodStart: 500 },
        });
        const merged = mergePrepProgress(cloud, local);

        expect(merged.starHistory).toHaveLength(2);
        expect(merged.codingProgress.solvedIds).toEqual(
            expect.arrayContaining(["two-sum", "reverse-string"])
        );
        expect(merged.codingProgress.bestScores["two-sum"]).toBe(90);
        expect(merged.referralCredits).toBe(5);
        expect(merged.usage?.geminiCalls).toBe(10);
        expect(merged.usage?.sarvamCalls).toBe(8);
        expect(merged.usage?.periodStart).toBe(500);
    });

    it("prefers the most recent ATS match when merging", () => {
        const cloud = ensurePrepProgressShape({
            ...emptyPrepProgress(),
            atsMatchPercent: 70,
            atsLastAt: 100,
        });
        const local = ensurePrepProgressShape({
            ...emptyPrepProgress(),
            atsMatchPercent: 90,
            atsLastAt: 200,
        });
        expect(mergePrepProgress(cloud, local).atsMatchPercent).toBe(90);
        expect(mergePrepProgress(local, cloud).atsMatchPercent).toBe(90);
    });

    it("handles null/undefined cloud or local gracefully", () => {
        const merged = mergePrepProgress(null, emptyPrepProgress());
        expect(merged.starHistory).toEqual([]);
        expect(merged.referralCredits).toBe(0);
    });
});
