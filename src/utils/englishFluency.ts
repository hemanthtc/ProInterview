import { FLUENCY_WORDS, PHRASE_UPGRADES, type FluencyWord } from "@/data/englishFluency";

const PROGRESS_KEY = "prointerview_english_fluency";

export interface FluencyProgress {
    xp: number;
    learnedIds: string[];
    quizCorrect: number;
    quizTotal: number;
    lastSpeakScore: number;
    updatedAt: number;
}

export function emptyFluencyProgress(): FluencyProgress {
    return { xp: 0, learnedIds: [], quizCorrect: 0, quizTotal: 0, lastSpeakScore: 0, updatedAt: 0 };
}

export function loadFluencyProgress(): FluencyProgress {
    if (typeof window === "undefined") return emptyFluencyProgress();
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (!raw) return emptyFluencyProgress();
        const parsed = JSON.parse(raw) as Partial<FluencyProgress>;
        return {
            ...emptyFluencyProgress(),
            ...parsed,
            learnedIds: Array.isArray(parsed.learnedIds) ? parsed.learnedIds.map(String) : [],
        };
    } catch {
        return emptyFluencyProgress();
    }
}

export function saveFluencyProgress(next: FluencyProgress): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...next, updatedAt: Date.now() }));
}

function daySeed(now = Date.now()): number {
    const d = new Date(now);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function mulberry32(seed: number) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function dailyWords(count = 3, now = Date.now()): FluencyWord[] {
    const rand = mulberry32(daySeed(now));
    const pool = [...FLUENCY_WORDS];
    const picked: FluencyWord[] = [];
    while (picked.length < Math.min(count, pool.length)) {
        const i = Math.floor(rand() * pool.length);
        picked.push(pool.splice(i, 1)[0]);
    }
    return picked;
}

export function quizOptions(word: FluencyWord): string[] {
    const opts = [word.meaning, ...word.distractors];
    return opts.sort((a, b) => a.localeCompare(b));
}

export function tokens(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);
}

export function tokenOverlapScore(spoken: string, target: string): number {
    const a = new Set(tokens(spoken));
    const b = tokens(target);
    if (b.length === 0) return 0;
    const hits = b.filter((w) => a.has(w)).length;
    return Math.round((hits / b.length) * 100);
}

export function polishEnglishOffline(input: string): { polished: string; tips: string[]; applied: string[] } {
    let polished = input.trim().replace(/\s+/g, " ");
    if (!polished) {
        return { polished: "", tips: ["Speak or type a short answer first."], applied: [] };
    }
    const applied: string[] = [];
    const lower = polished.toLowerCase();
    for (const rule of PHRASE_UPGRADES) {
        if (lower.includes(rule.from)) {
            const re = new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            polished = polished.replace(re, rule.to).replace(/\s+/g, " ").trim();
            applied.push(`${rule.from} → ${rule.to || "(remove)"}`);
        }
    }
    if (polished.length) {
        polished = polished.charAt(0).toUpperCase() + polished.slice(1);
    }
    if (!/[.?!]$/.test(polished)) polished += ".";

    const tips: string[] = [];
    if (applied.length) tips.push("I swapped a few campus-English phrases for interview English.");
    if (/\b(um+|uh+|like|you know)\b/i.test(input)) tips.push("Drop fillers. A short silent pause sounds more confident.");
    if (input.split(/\s+/).length > 80) tips.push("Aim for 40–60 words so the interviewer can follow.");
    if (tips.length === 0) tips.push("Clear start. Add one number (users, %, time saved) to sound more professional.");
    return { polished, tips, applied };
}

export type FluencyTab = "words" | "speak" | "fluency" | "polish";

export function fluencyTabLabel(tab: FluencyTab): string {
    switch (tab) {
        case "words":
            return "New words";
        case "speak":
            return "Speak";
        case "fluency":
            return "Fluency minute";
        case "polish":
            return "Upgrade English";
        default: {
            const _never: never = tab;
            return _never;
        }
    }
}
