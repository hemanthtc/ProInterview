import { describe, it, expect } from "vitest";
import { capNewest, MAX_SYNCED_SESSIONS } from "../src/utils/progressCaps";

describe("capNewest", () => {
    it("keeps the newest timestamps up to max", () => {
        const items = [
            { timestamp: 1 },
            { timestamp: 50 },
            { timestamp: 10 },
        ];
        expect(capNewest(items, 2)).toEqual([{ timestamp: 50 }, { timestamp: 10 }]);
    });

    it("exports a session cap used by sync", () => {
        expect(MAX_SYNCED_SESSIONS).toBeGreaterThan(10);
    });
});
