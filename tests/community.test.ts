import { describe, it, expect } from "vitest";
import { dmSlug, sanitizeChatBody } from "../src/utils/community";

describe("community helpers", () => {
    it("sanitizes and truncates chat bodies", () => {
        expect(sanitizeChatBody("  hello   world  ")).toBe("hello world");
        expect(sanitizeChatBody("x".repeat(3000)).length).toBe(2000);
        expect(sanitizeChatBody("   ")).toBe("");
    });

    it("builds stable DM slugs regardless of order", () => {
        expect(dmSlug("b@x.com", "a@x.com")).toBe(dmSlug("a@x.com", "b@x.com"));
        expect(dmSlug("A@X.com", "b@x.com")).toContain("dm_");
    });
});
