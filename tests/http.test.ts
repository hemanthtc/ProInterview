import { describe, it, expect } from "vitest";
import { z } from "zod";
import { aptitudeQuizBodySchema, mockTestBodySchema, publicErrorMessage, runCodeBodySchema } from "../src/utils/http";

describe("publicErrorMessage", () => {
    it("surfaces Error.message outside production (Vitest NODE_ENV is test)", () => {
        expect(publicErrorMessage(new Error("ECONNREFUSED mongo"))).toBe("ECONNREFUSED mongo");
    });

    it("falls back when the value is empty", () => {
        expect(publicErrorMessage("", "Internal server error")).toBe("Internal server error");
    });
});

describe("API body schemas", () => {
    it("accepts known aptitude categories only", () => {
        expect(aptitudeQuizBodySchema.parse({ category: "logicalReasoning" }).category).toBe("logicalReasoning");
        expect(() => aptitudeQuizBodySchema.parse({ category: "drop tables" })).toThrow();
    });

    it("accepts campus mock-test paths only", () => {
        expect(mockTestBodySchema.parse({ aptitudePath: "offCampus" }).aptitudePath).toBe("offCampus");
        expect(() => mockTestBodySchema.parse({ aptitudePath: "other" })).toThrow();
    });

    it("rejects oversized run-code payloads via max length", () => {
        expect(() => runCodeBodySchema.parse({ code: "x".repeat(200_001), language: "js" })).toThrow();
        expect(runCodeBodySchema.parse({ code: "console.log(1)", language: "js" }).code).toBe("console.log(1)");
    });

    it("parse helper shape matches zod", () => {
        const schema = z.object({ n: z.number() });
        expect(schema.safeParse({ n: 1 }).success).toBe(true);
        expect(schema.safeParse({ n: "1" }).success).toBe(false);
    });
});
