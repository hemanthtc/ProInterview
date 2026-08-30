export interface SavedNegotiateScript {
    id: string;
    company: string;
    role: string;
    script: string;
    savedAt: number;
}

const KEY = "negotiateScripts";

export function loadNegotiateScripts(): SavedNegotiateScript[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
    } catch {
        return [];
    }
}

export function saveNegotiateScript(entry: Omit<SavedNegotiateScript, "id" | "savedAt">): SavedNegotiateScript[] {
    const next: SavedNegotiateScript = {
        ...entry,
        id: `neg-${Date.now()}`,
        savedAt: Date.now(),
    };
    const list = [next, ...loadNegotiateScripts().filter((s) => s.script !== entry.script)].slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
}
