import { describe, it, expect } from "vitest";
import { buildMeetLink, getCoach, COACHES } from "../src/data/coaches";
import { toSarvamLanguageCode } from "../src/utils/sarvam";

describe("coach marketplace data", () => {
    it("has INR rates and meet links", () => {
        expect(COACHES.length).toBeGreaterThanOrEqual(3);
        expect(getCoach("coach_priya")?.rateInr).toBeGreaterThan(0);
        expect(buildMeetLink("cb_test_123")).toContain("meet.jit.si/ProInterview-");
    });
});

describe("sarvam locale mapping", () => {
    it("maps browser locales to Sarvam codes", () => {
        expect(toSarvamLanguageCode("hi-IN")).toBe("hi-IN");
        expect(toSarvamLanguageCode("ta-IN")).toBe("ta-IN");
        expect(toSarvamLanguageCode("en-US")).toBe("en-IN");
        expect(toSarvamLanguageCode("unknown")).toBe("en-IN");
    });
});
