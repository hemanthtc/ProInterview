import type { VoiceCoachSnapshot } from "@/utils/voiceCoach";

export interface VoiceWeekPoint {
    at: number;
    wpm: number;
    fillerRate: number;
}

const KEY = "voiceCoachWeekly";

export function loadVoiceWeek(): VoiceWeekPoint[] {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function recordVoiceWeek(snapshot: VoiceCoachSnapshot): VoiceWeekPoint[] {
    const point: VoiceWeekPoint = {
        at: Date.now(),
        wpm: Number(snapshot.wpm) || 0,
        fillerRate: Number(snapshot.fillerRate) || 0,
    };
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const list = [...loadVoiceWeek().filter((p) => p.at >= weekAgo), point].slice(-40);
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
}

export function voiceWeekSummary(points = loadVoiceWeek()) {
    if (!points.length) return { avgWpm: 0, avgFiller: 0, samples: 0 };
    const avgWpm = Math.round(points.reduce((a, p) => a + p.wpm, 0) / points.length);
    const avgFiller = Math.round((points.reduce((a, p) => a + p.fillerRate, 0) / points.length) * 1000) / 10;
    return { avgWpm, avgFiller, samples: points.length };
}
