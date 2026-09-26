import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { isCronAuthorized } from "../src/utils/cronAuth";

describe("isCronAuthorized", () => {
    const prev = process.env.CRON_SECRET;

    afterEach(() => {
        if (prev === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = prev;
    });

    it("fails closed when CRON_SECRET is unset", () => {
        delete process.env.CRON_SECRET;
        const req = new NextRequest("http://localhost/api/community/cleanup", {
            method: "POST",
            headers: { "x-cron-secret": "anything" },
        });
        expect(isCronAuthorized(req)).toBe(false);
    });

    it("accepts a matching header", () => {
        process.env.CRON_SECRET = "unit-test-cron-secret";
        const req = new NextRequest("http://localhost/api/community/cleanup", {
            method: "POST",
            headers: { "x-cron-secret": "unit-test-cron-secret" },
        });
        expect(isCronAuthorized(req)).toBe(true);
    });

    it("rejects a wrong secret", () => {
        process.env.CRON_SECRET = "unit-test-cron-secret";
        const req = new NextRequest("http://localhost/api/community/cleanup?secret=nope", {
            method: "POST",
        });
        expect(isCronAuthorized(req)).toBe(false);
    });
});
