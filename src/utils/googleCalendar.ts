const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Best-effort mapping of a freeform slot label (e.g. "Tue 18:00 IST") to the next
 * matching calendar date/time on the server clock. This is a v1 heuristic — it does
 * not resolve the timezone abbreviation, so treat the result as approximate.
 */
export function nextSlotDate(slot: string, from: Date = new Date()): Date {
    const dayMatch = slot.match(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/i);
    const timeMatch = slot.match(/(\d{1,2}):(\d{2})/);
    const result = new Date(from);

    if (!dayMatch || !timeMatch) {
        result.setDate(result.getDate() + 1);
        result.setHours(18, 0, 0, 0);
        return result;
    }

    const targetDay = WEEKDAYS.findIndex((d) => d.toLowerCase() === dayMatch[1].toLowerCase());
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    result.setHours(hour, minute, 0, 0);

    let daysAhead = (targetDay - result.getDay() + 7) % 7;
    if (daysAhead === 0 && result.getTime() <= from.getTime()) daysAhead = 7;
    result.setDate(result.getDate() + daysAhead);
    return result;
}

function toGoogleDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Builds an "Add to Google Calendar" template link — no OAuth required. */
export function buildGoogleCalendarUrl(input: {
    title: string;
    details: string;
    startIso: string;
    durationMin?: number;
    location?: string;
}): string {
    const start = new Date(input.startIso);
    const end = new Date(start.getTime() + (input.durationMin || 45) * 60 * 1000);

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: input.title,
        dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
        details: input.details,
    });
    if (input.location) params.set("location", input.location);

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
