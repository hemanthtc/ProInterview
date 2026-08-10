import { describe, it, expect } from "vitest";
import {
    SYSTEM_DESIGN_SEED_QUESTIONS,
    normalizeGeneratedQuestions,
    shufflePickQuestions,
} from "../src/data/systemDesignQuestions";
import { createBoardShape, summarizeBoard, SHAPE_PALETTE } from "../src/utils/systemDesignBoard";

describe("system design questions", () => {
    it("has a larger seed bank than the old 4-prompt list", () => {
        expect(SYSTEM_DESIGN_SEED_QUESTIONS.length).toBeGreaterThanOrEqual(16);
    });

    it("shuffles and respects difficulty filter", () => {
        const hard = shufflePickQuestions(SYSTEM_DESIGN_SEED_QUESTIONS, 5, "hard");
        expect(hard.length).toBeGreaterThan(0);
        expect(hard.every((q) => q.difficulty === "hard")).toBe(true);
    });

    it("normalizes online generator payloads", () => {
        const out = normalizeGeneratedQuestions(
            {
                questions: [
                    {
                        title: "Chat",
                        prompt: "Design a chat system",
                        difficulty: "hard",
                        topics: ["websockets"],
                    },
                ],
            },
            3
        );
        expect(out).toHaveLength(1);
        expect(out[0].prompt).toMatch(/chat/i);
    });
});

describe("system design board", () => {
    it("exposes a shape palette for drag-drop", () => {
        expect(SHAPE_PALETTE.map((s) => s.kind)).toContain("database");
        expect(SHAPE_PALETTE.map((s) => s.kind)).toContain("arrow");
    });

    it("summarizes shapes and freestyle ink for online eval", () => {
        const shapes = [
            createBoardShape("service", 10, 20, "API Gateway"),
            createBoardShape("database", 200, 40, "Users DB"),
        ];
        const summary = summarizeBoard(shapes, true);
        expect(summary).toContain("API Gateway");
        expect(summary).toContain("Users DB");
        expect(summary).toMatch(/freehand/i);
    });
});
