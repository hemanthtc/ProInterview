import { describe, it, expect } from "vitest";
import { CODING_PROBLEMS, getProblemPublic } from "../src/data/codingProblems";
import { pickAssessmentProblems, mulberry32 } from "../src/utils/pickAssessmentProblems";
import { buildFunctionHarness, compareOutputs, normalizeStdout } from "../src/utils/codingHarness";
import { estimateFaceFromImageData } from "../src/utils/localFacePresence";

describe("assessment problem bank", () => {
    it("covers all four platforms", () => {
        const sources = new Set(CODING_PROBLEMS.map((p) => p.source));
        expect(sources.has("leetcode")).toBe(true);
        expect(sources.has("hackerrank")).toBe(true);
        expect(sources.has("codeforces")).toBe(true);
        expect(sources.has("codechef")).toBe(true);
    });

    it("keeps hidden tests off the public payload", () => {
        const pub = getProblemPublic("watermelon");
        expect(pub && "hiddenTests" in pub).toBe(false);
        expect(pub?.sourceLabel).toBe("Codeforces");
        expect(pub?.ioMode).toBe("stdio");
    });
});

describe("pickAssessmentProblems", () => {
    it("is deterministic for a seed and prefers mixed sources", () => {
        const a = pickAssessmentProblems(4, mulberry32(42));
        const b = pickAssessmentProblems(4, mulberry32(42));
        expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
        expect(new Set(a.map((p) => p.source)).size).toBeGreaterThanOrEqual(3);
    });

    it("never returns more than requested", () => {
        expect(pickAssessmentProblems(2, mulberry32(7))).toHaveLength(2);
    });
});

describe("coding harness", () => {
    it("builds a function harness for two-sum", () => {
        const problem = CODING_PROBLEMS.find((p) => p.id === "two-sum");
        expect(problem).toBeTruthy();
        const src = buildFunctionHarness(problem!, "javascript", "function twoSum(){}", [
            { input: "{}", expected: "[]" },
        ]);
        expect(src).toContain("twoSum");
        expect(src).toContain("__results");
    });

    it("normalizes stdout for HackerRank-style compare", () => {
        expect(compareOutputs("YES\r\n", "YES")).toBe(true);
        expect(normalizeStdout("31  \n")).toBe("31");
    });
});

function pixels(width: number, height: number, paint?: (data: Uint8ClampedArray) => void) {
    const data = new Uint8ClampedArray(width * height * 4);
    paint?.(data);
    return { data, width, height };
}

describe("local face presence", () => {
    it("flags empty frames as no face", () => {
        const estimate = estimateFaceFromImageData(pixels(32, 32));
        expect(estimate.faceVisible).toBe(false);
        expect(estimate.expressionGuess).toBe("no_face");
    });

    it("detects a skin-tone blob in the center", () => {
        const width = 40;
        const height = 40;
        const image = pixels(width, height, (data) => {
            for (let y = 8; y < 32; y++) {
                for (let x = 12; x < 28; x++) {
                    const i = (y * width + x) * 4;
                    data[i] = 190;
                    data[i + 1] = 120;
                    data[i + 2] = 90;
                    data[i + 3] = 255;
                }
            }
        });
        const estimate = estimateFaceFromImageData(image);
        expect(estimate.faceVisible).toBe(true);
    });
});
