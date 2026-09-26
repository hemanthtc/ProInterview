const FILLER_PATTERNS = [
    /\b(um+|uh+|erm+|ah+|uhh+)\b/gi,
    /\b(like)\b/gi,
    /\b(you know)\b/gi,
    /\b(basically)\b/gi,
    /\b(actually)\b/gi,
    /\b(sort of|kind of)\b/gi,
    /\b(i mean)\b/gi,
    /\b(right\?)\b/gi,
];

export interface VoiceCoachSnapshot {
    words: number;
    fillers: number;
    fillerRate: number;
    wpm: number;
    silenceMs: number;
    confidence: number;
    tips: string[];
    moodHint: "calm" | "rushed" | "hesitant" | "strong";
    updatedAt: number;
}

export function countFillers(text: string): number {
    let count = 0;
    for (const re of FILLER_PATTERNS) {
        const matches = text.match(re);
        if (matches) count += matches.length;
    }
    return count;
}

export function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

export function analyzeUtterance(input: {
    text: string;
    durationMs: number;
    silenceMs?: number;
}): VoiceCoachSnapshot {
    const words = countWords(input.text);
    const fillers = countFillers(input.text);
    const minutes = Math.max(input.durationMs, 1) / 60000;
    const wpm = Math.round(words / minutes);
    const fillerRate = words > 0 ? fillers / words : 0;
    const silenceMs = input.silenceMs ?? 0;

    let confidence = 72;
    if (wpm > 190) confidence -= 18;
    else if (wpm > 170) confidence -= 10;
    else if (wpm < 90 && words > 8) confidence -= 12;
    else if (wpm >= 120 && wpm <= 165) confidence += 8;

    if (fillerRate > 0.12) confidence -= 20;
    else if (fillerRate > 0.07) confidence -= 10;
    else if (fillerRate < 0.03 && words > 5) confidence += 6;

    if (silenceMs > 8000) confidence -= 8;
    else if (silenceMs > 4500) confidence -= 4;

    confidence = Math.max(5, Math.min(98, Math.round(confidence)));

    const tips: string[] = [];
    if (fillerRate > 0.07) tips.push("Cut fillers — pause silently instead of “um/like”.");
    if (wpm > 175) tips.push("Slow down ~10% so answers land cleaner.");
    if (wpm < 95 && words > 10) tips.push("Pick up the pace slightly — long pauses read as uncertainty.");
    if (silenceMs > 5000) tips.push("You went quiet a while — a short bridge phrase helps (“Let me structure that”).");
    if (tips.length === 0) tips.push("Solid delivery — keep answers structured (Situation → Action → Result).");

    let moodHint: VoiceCoachSnapshot["moodHint"] = "calm";
    if (wpm > 175 || fillerRate > 0.1) moodHint = "rushed";
    else if (silenceMs > 6000 || (wpm < 95 && fillers > 2)) moodHint = "hesitant";
    else if (confidence >= 80 && fillerRate < 0.05) moodHint = "strong";

    return {
        words,
        fillers,
        fillerRate: Math.round(fillerRate * 1000) / 1000,
        wpm: Number.isFinite(wpm) ? wpm : 0,
        silenceMs,
        confidence,
        tips: tips.slice(0, 3),
        moodHint,
        updatedAt: Date.now(),
    };
}

export function mergeCoachStats(
    prev: VoiceCoachSnapshot | null,
    next: VoiceCoachSnapshot
): VoiceCoachSnapshot {
    if (!prev) return next;
    const words = prev.words + next.words;
    const fillers = prev.fillers + next.fillers;
    const fillerRate = words > 0 ? fillers / words : 0;
    const wpm = Math.round((prev.wpm + next.wpm) / 2);
    const confidence = Math.round(prev.confidence * 0.4 + next.confidence * 0.6);
    return {
        ...next,
        words,
        fillers,
        fillerRate: Math.round(fillerRate * 1000) / 1000,
        wpm,
        confidence,
        tips: next.tips,
    };
}

/** Derive 3 fixable end-of-call habits from cumulative coach stats. */
export function endCallHabits(stats: VoiceCoachSnapshot | null): string[] {
    if (!stats) {
        return [
            "Practice a 60-second pitch without filler words.",
            "Aim for ~140 WPM — clear, not rushed.",
            "Use STAR: Situation → Action → Result on every behavioral answer.",
        ];
    }
    const habits: string[] = [];
    if (stats.fillerRate > 0.05) habits.push(`You averaged ${Math.round(stats.fillerRate * 100)}% fillers — replace “um/like” with a silent pause.`);
    if (stats.wpm > 170) habits.push(`Pace ran hot (~${stats.wpm} WPM) — slow 10% so answers land.`);
    else if (stats.wpm < 100 && stats.words > 20) habits.push(`Pace was slow (~${stats.wpm} WPM) — tighten openings to the result first.`);
    if (stats.confidence < 70) habits.push("Confidence dipped — lead with the outcome, then cover actions in 2–3 bullets.");
    if (habits.length < 3) habits.push("Record one 90-second STAR story and rewatch for rambling.");
    if (habits.length < 3) habits.push("Ask one clarifying question before diving into design/code.");
    return habits.slice(0, 3);
}
