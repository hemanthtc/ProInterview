import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

/**
 * Fail closed: cron routes must present CRON_SECRET.
 * Unset secret → reject (do not allow anonymous cleanup).
 */
export function isCronAuthorized(req: NextRequest): boolean {
    const configured = process.env.CRON_SECRET?.trim();
    if (!configured) return false;

    const presented =
        req.headers.get("x-cron-secret")?.trim() ||
        new URL(req.url).searchParams.get("secret")?.trim() ||
        "";
    if (!presented) return false;

    const a = Buffer.from(configured);
    const b = Buffer.from(presented);
    if (a.length !== b.length) return false;
    try {
        return timingSafeEqual(a, b);
    } catch {
        return false;
    }
}
