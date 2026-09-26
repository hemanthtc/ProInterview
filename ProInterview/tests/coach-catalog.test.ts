import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl, nextSlotDate } from "../src/utils/googleCalendar";

describe("nextSlotDate", () => {
    it("resolves a weekday + time slot to the next matching occurrence", () => {
        // Monday 2026-08-10 10:00 UTC as the reference "now".
        const from = new Date("2026-08-10T10:00:00Z");
        const next = nextSlotDate("Wed 18:00 IST", from);
        expect(next.getDay()).toBe(3); // Wednesday
        expect(next.getHours()).toBe(18);
        expect(next.getMinutes()).toBe(0);
        expect(next.getTime()).toBeGreaterThan(from.getTime());
    });

    it("rolls over to next week when the target time has already passed today", () => {
        const from = new Date("2026-08-10T20:00:00Z"); // Monday 20:00
        const next = nextSlotDate("Mon 09:00", from);
        expect(next.getDay()).toBe(1);
        const daysAhead = Math.round((next.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysAhead).toBeGreaterThanOrEqual(6);
    });

    it("falls back to tomorrow 18:00 when the slot label is unparseable", () => {
        const from = new Date("2026-08-10T10:00:00Z");
        const next = nextSlotDate("whenever works", from);
        expect(next.getHours()).toBe(18);
        expect(next.getDate()).toBe(from.getDate() + 1);
    });
});

describe("buildGoogleCalendarUrl", () => {
    it("builds a valid Google Calendar template URL with start/end dates", () => {
        const url = buildGoogleCalendarUrl({
            title: "Mock Interview with Priya",
            details: "STAR coaching session",
            startIso: "2026-08-12T13:00:00.000Z",
            durationMin: 45,
        });
        expect(url).toContain("https://calendar.google.com/calendar/render?");
        expect(url).toContain("action=TEMPLATE");
        expect(url).toContain("text=Mock+Interview");
        expect(url).toMatch(/dates=20260812T130000Z%2F20260812T134500Z/);
    });

    it("defaults the duration to 45 minutes when not provided", () => {
        const url = buildGoogleCalendarUrl({
            title: "Coaching call",
            details: "",
            startIso: "2026-08-12T10:00:00.000Z",
        });
        expect(url).toMatch(/dates=20260812T100000Z%2F20260812T104500Z/);
    });

    it("includes an optional location parameter when provided", () => {
        const url = buildGoogleCalendarUrl({
            title: "Coaching call",
            details: "",
            startIso: "2026-08-12T10:00:00.000Z",
            location: "Google Meet",
        });
        expect(url).toContain("location=Google+Meet");
    });

    it("omits the location parameter when not provided", () => {
        const url = buildGoogleCalendarUrl({
            title: "Coaching call",
            details: "",
            startIso: "2026-08-12T10:00:00.000Z",
        });
        expect(url).not.toContain("location=");
    });
});
