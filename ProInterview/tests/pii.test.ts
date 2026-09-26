import { describe, it, expect } from "vitest";
import { redactPii, redactLogIdentifier } from "../src/utils/pii";

describe("redactPii", () => {
    it("replaces emails and long phone numbers", () => {
        const out = redactPii("Contact ada@example.com or +91 98765 43210 please");
        expect(out).not.toMatch(/ada@example.com/);
        expect(out).toContain("[redacted-email]");
        expect(out).toContain("[redacted-phone]");
    });

    it("leaves short numbers alone", () => {
        expect(redactPii("see chapter 12")).toBe("see chapter 12");
    });
});

describe("redactLogIdentifier", () => {
    it("masks emails", () => {
        expect(redactLogIdentifier("hemanth@example.com")).toBe("he***@example.com");
    });
});
