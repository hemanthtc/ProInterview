export interface AtsHistoryEntry {
    jobTitle: string;
    company: string;
    matchPercent: number;
    at: number;
}

const KEY = "atsMatchHistory";

export function loadAtsHistory(): AtsHistoryEntry[] {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
    } catch {
        return [];
    }
}

export function pushAtsHistory(entry: Omit<AtsHistoryEntry, "at">): AtsHistoryEntry[] {
    const list = [{ ...entry, at: Date.now() }, ...loadAtsHistory()].slice(0, 20);
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
}
