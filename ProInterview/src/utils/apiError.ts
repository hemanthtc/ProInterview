"use client";

/** Parse Retry-After / rate-limit errors into user-facing copy. */
export function formatRateLimitMessage(error: unknown, retryAfterSec?: number): string {
    const msg = error instanceof Error ? error.message : String(error || "");
    const fromMsg = msg.match(/retry in (\d+)/i);
    const sec = retryAfterSec ?? (fromMsg ? Number(fromMsg[1]) : undefined);
    if (sec && Number.isFinite(sec)) {
        if (sec < 120) return `Rate limited. Retry in ${sec}s.`;
        const mins = Math.ceil(sec / 60);
        return `Rate limited. Retry in about ${mins} minute${mins === 1 ? "" : "s"}.`;
    }
    if (/rate limit|429/i.test(msg)) return "Rate limited. Please wait a moment and try again.";
    return msg || "Request failed";
}

export async function readApiError(res: Response): Promise<{ message: string; retryAfterSec?: number }> {
    const retryHeader = res.headers.get("Retry-After");
    const retryAfterSec = retryHeader ? Number(retryHeader) : undefined;
    let data: { error?: string } = {};
    try {
        data = await res.json();
    } catch {
        /* ignore */
    }
    return {
        message: formatRateLimitMessage(data.error || res.statusText, retryAfterSec),
        retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
    };
}
