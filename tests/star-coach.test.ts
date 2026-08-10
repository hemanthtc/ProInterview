import { describe, it, expect } from "vitest";
import {
    STAR_SEED_QUESTIONS,
    normalizeGeneratedStarQuestions,
    shuffleStarQuestions,
} from "../src/data/starCoachQuestions";

describe("star coach questions", () => {
    it("has a seed bank of behavioral prompts", () => {
        expect(STAR_SEED_QUESTIONS.length).toBeGreaterThanOrEqual(12);
    });

    it("shuffles by category", () => {
        const conflict = shuffleStarQuestions(STAR_SEED_QUESTIONS, 3, "conflict");
        expect(conflict.every((q) => q.category === "conflict")).toBe(true);
    });

    it("normalizes online generator payloads", () => {
        const out = normalizeGeneratedStarQuestions({
            questions: [
                {
                    question: "Tell me about a failure",
                    category: "failure",
                    focus: "accountability",
                    suggestedWeakSpot: "blame others",
                },
            ],
        });
        expect(out).toHaveLength(1);
        expect(out[0].question).toMatch(/failure/i);
        expect(out[0].suggestedWeakSpot).toMatch(/blame/i);
    });
});
