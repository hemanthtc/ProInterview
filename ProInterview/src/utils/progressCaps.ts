export const MAX_SYNCED_SESSIONS = 80;
export const MAX_SYNCED_PREP_PACKS = 40;
export const MAX_SYNCED_DRILLS = 80;
export const MAX_MOCK_APTITUDE_SESSIONS = 40;

function recency(item: unknown): number {
    if (!item || typeof item !== "object") return 0;
    const r = item as Record<string, unknown>;
    const n = Number(r.timestamp || r.updatedAt || r.createdAt || r.dueAt || 0);
    return Number.isFinite(n) ? n : 0;
}

/** Keep the newest `max` items (higher timestamp first). */
export function capNewest<T>(items: T[] | undefined | null, max: number): T[] {
    const list = Array.isArray(items) ? [...items] : [];
    if (list.length <= max) return list;
    return list.sort((a, b) => recency(b) - recency(a)).slice(0, max);
}
