import { getStorageItem, setStorageItem } from "@/utils/storage";
import type { PrepProgressBlob } from "@/models/CloudSession";

export interface StarHistoryEntry {
    id: string;
    question: string;
    story: string;
    weakSpot: string;
    score?: number;
    savedAt: number;
}

const KEY = "starCoachHistory";
const MAX = 5;

export function loadStarHistory(): StarHistoryEntry[] {
    try {
        const raw = getStorageItem(KEY) || localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
    } catch {
        return [];
    }
}

export function saveStarHistoryEntry(entry: Omit<StarHistoryEntry, "id" | "savedAt">): StarHistoryEntry[] {
    const next: StarHistoryEntry = {
        ...entry,
        id: `star-${Date.now()}`,
        savedAt: Date.now(),
    };
    const prev = loadStarHistory().filter(
        (e) => !(e.question === entry.question && e.story === entry.story)
    );
    const list = [next, ...prev].slice(0, MAX);
    const json = JSON.stringify(list);
    try {
        setStorageItem(KEY, json);
        localStorage.setItem(KEY, json);
    } catch {
        /* ignore quota */
    }
    return list;
}

export interface CodingProgress {
    solvedIds: string[];
    bestScores: Record<string, number>;
    lastProblemId?: string;
}

const CODING_KEY = "codingLabProgress";

export function loadCodingProgress(): CodingProgress {
    try {
        const raw = getStorageItem(CODING_KEY) || localStorage.getItem(CODING_KEY);
        if (!raw) return { solvedIds: [], bestScores: {} };
        const parsed = JSON.parse(raw);
        return {
            solvedIds: Array.isArray(parsed.solvedIds) ? parsed.solvedIds : [],
            bestScores: parsed.bestScores && typeof parsed.bestScores === "object" ? parsed.bestScores : {},
            lastProblemId: typeof parsed.lastProblemId === "string" ? parsed.lastProblemId : undefined,
        };
    } catch {
        return { solvedIds: [], bestScores: {} };
    }
}

export function saveCodingProgress(update: {
    problemId: string;
    score: number;
}): CodingProgress {
    const prev = loadCodingProgress();
    const best = Math.max(prev.bestScores[update.problemId] || 0, update.score);
    const solvedIds =
        best >= 70 && !prev.solvedIds.includes(update.problemId)
            ? [...prev.solvedIds, update.problemId]
            : prev.solvedIds;
    const next: CodingProgress = {
        solvedIds,
        bestScores: { ...prev.bestScores, [update.problemId]: best },
        lastProblemId: update.problemId,
    };
    const json = JSON.stringify(next);
    try {
        setStorageItem(CODING_KEY, json);
        localStorage.setItem(CODING_KEY, json);
    } catch {
        /* ignore */
    }
    return next;
}

export interface PrepSnapshot {
    company: string;
    role: string;
    starStories: number;
    codingSolved: number;
    atsMatch?: number;
    filmRoomGaps: string[];
    domainPackId?: string;
}

export function buildPrepSnapshot(): PrepSnapshot {
    const company = localStorage.getItem("targetCompany") || "";
    const role = localStorage.getItem("preferredRoles") || "";
    const star = loadStarHistory();
    const coding = loadCodingProgress();
    const atsRaw = localStorage.getItem("atsMatchPercent");
    const atsMatch = atsRaw ? Number(atsRaw) : undefined;
    const filmGaps: string[] = [];
    try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith("filmRoom_"));
        if (keys.length) {
            const raw = localStorage.getItem(keys.sort().reverse()[0] || "");
            if (raw) {
                const data = JSON.parse(raw);
                for (const a of data.annotations || []) {
                    if (a.kind === "gap" && a.label) filmGaps.push(String(a.label));
                }
                for (const f of data.practiceFocus || []) filmGaps.push(String(f));
            }
        }
    } catch {
        /* ignore */
    }
    return {
        company,
        role,
        starStories: star.length,
        codingSolved: coding.solvedIds.length,
        atsMatch: Number.isFinite(atsMatch) ? atsMatch : undefined,
        filmRoomGaps: [...new Set(filmGaps)].slice(0, 5),
        domainPackId: localStorage.getItem("domainPackId") || undefined,
    };
}

export function buildLocalPrepProgress(): PrepProgressBlob {
    const atsRaw = localStorage.getItem("atsMatchPercent");
    const atsMatch = atsRaw ? Number(atsRaw) : undefined;
    const atsLastAtRaw = localStorage.getItem("atsMatchAt");
    return {
        starHistory: loadStarHistory(),
        codingProgress: loadCodingProgress(),
        atsMatchPercent: Number.isFinite(atsMatch) ? atsMatch : undefined,
        atsLastAt: atsLastAtRaw ? Number(atsLastAtRaw) : undefined,
        domainPackId: localStorage.getItem("domainPackId") || undefined,
    };
}

export function applyCloudPrepProgress(prep: PrepProgressBlob) {
    if (Array.isArray(prep.starHistory)) {
        const json = JSON.stringify(prep.starHistory.slice(0, MAX));
        try {
            setStorageItem(KEY, json);
            localStorage.setItem(KEY, json);
        } catch {
            /* ignore */
        }
    }
    if (prep.codingProgress) {
        const json = JSON.stringify(prep.codingProgress);
        try {
            setStorageItem(CODING_KEY, json);
            localStorage.setItem(CODING_KEY, json);
        } catch {
            /* ignore */
        }
    }
    if (typeof prep.atsMatchPercent === "number") {
        localStorage.setItem("atsMatchPercent", String(prep.atsMatchPercent));
        if (prep.atsLastAt) localStorage.setItem("atsMatchAt", String(prep.atsLastAt));
    }
    if (prep.domainPackId) localStorage.setItem("domainPackId", prep.domainPackId);
}
