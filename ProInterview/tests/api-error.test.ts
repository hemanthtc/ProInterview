import { describe, it, expect } from "vitest";
import { formatRateLimitMessage, readApiError } from "../src/utils/apiError";

describe("formatRateLimitMessage", () => {
    it("formats short retry windows in seconds", () => {
        expect(formatRateLimitMessage(new Error("Rate limited"), 30)).toBe(
            "Rate limited. Retry in 30s."
        );
    });

    it("formats long retry windows in minutes", () => {
        expect(formatRateLimitMessage(new Error("Rate limited"), 150)).toBe(
            "Rate limited. Retry in about 3 minutes."
        );
    });

    it("uses singular minute wording just above the one-minute threshold", () => {
        expect(formatRateLimitMessage(new Error("Rate limited"), 121)).toBe(
            "Rate limited. Retry in about 3 minutes."
        );
        expect(formatRateLimitMessage(new Error("Rate limited"), 120)).toBe(
            "Rate limited. Retry in about 2 minutes."
        );
    });

    it("extracts the retry seconds from the error message when not passed explicitly", () => {
        expect(formatRateLimitMessage(new Error("Rate limited. Retry in 45s."))).toBe(
            "Rate limited. Retry in 45s."
        );
    });

    it("falls back to a generic rate-limit message for 429s without a retry hint", () => {
        expect(formatRateLimitMessage(new Error("429 Too Many Requests"))).toBe(
            "Rate limited. Please wait a moment and try again."
        );
    });

    it("passes through unrelated error messages unchanged", () => {
        expect(formatRateLimitMessage(new Error("Something else broke"))).toBe(
            "Something else broke"
        );
    });

    it("handles non-Error inputs and empty messages", () => {
        expect(formatRateLimitMessage("plain string error")).toBe("plain string error");
        expect(formatRateLimitMessage(undefined)).toBe("Request failed");
    });
});

describe("readApiError", () => {
    function mockResponse(body: unknown, opts: { retryAfter?: string; statusText?: string } = {}): Response {
        return {
            headers: {
                get: (name: string) => (name === "Retry-After" ? opts.retryAfter ?? null : null),
            },
            statusText: opts.statusText ?? "",
            json: async () => body,
        } as unknown as Response;
    }

    it("reads the error field and Retry-After header from a JSON response", async () => {
        const res = mockResponse({ error: "Rate limited. Retry in 20s." }, { retryAfter: "20" });
        const result = await readApiError(res);
        expect(result.message).toBe("Rate limited. Retry in 20s.");
        expect(result.retryAfterSec).toBe(20);
    });

    it("falls back to statusText when the body has no error field", async () => {
        const res = mockResponse({}, { statusText: "Internal Server Error" });
        const result = await readApiError(res);
        expect(result.message).toBe("Internal Server Error");
        expect(result.retryAfterSec).toBeUndefined();
    });

    it("handles a response whose body is not valid JSON", async () => {
        const res = {
            headers: { get: () => null },
            statusText: "Bad Gateway",
            json: async () => {
                throw new Error("not json");
            },
        } as unknown as Response;
        const result = await readApiError(res);
        expect(result.message).toBe("Bad Gateway");
    });
});
