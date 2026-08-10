import connectDB from "@/utils/db";
import CloudSession, { type PrepProgressBlob } from "@/models/CloudSession";
import Notification from "@/models/Notification";

export type { PrepProgressBlob };

const FREE_GEMINI_MONTHLY = 80;
const FREE_SARVAM_MONTHLY = 40;
const PRO_GEMINI_MONTHLY = 500;
const PRO_SARVAM_MONTHLY = 200;

function monthStart(ts = Date.now()) {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function emptyPrepProgress(): PrepProgressBlob {
    return {
        starHistory: [],
        codingProgress: { solvedIds: [], bestScores: {} },
        referralCredits: 0,
        usage: {
            geminiCalls: 0,
            sarvamCalls: 0,
            coachBookings: 0,
            periodStart: monthStart(),
        },
    };
}

export function ensurePrepProgressShape(
    incoming?: PrepProgressBlob | null
): PrepProgressBlob {
    const base = emptyPrepProgress();
    if (!incoming || typeof incoming !== "object") return base;
    return {
        starHistory: Array.isArray(incoming.starHistory) ? incoming.starHistory : [],
        codingProgress: {
            solvedIds: Array.isArray(incoming.codingProgress?.solvedIds)
                ? incoming.codingProgress.solvedIds
                : [],
            bestScores:
                incoming.codingProgress?.bestScores &&
                typeof incoming.codingProgress.bestScores === "object"
                    ? incoming.codingProgress.bestScores
                    : {},
            lastProblemId: incoming.codingProgress?.lastProblemId,
        },
        atsMatchPercent: incoming.atsMatchPercent,
        atsLastAt: incoming.atsLastAt,
        domainPackId: incoming.domainPackId,
        referralCredits: Number(incoming.referralCredits) || 0,
        usage: {
            geminiCalls: Number(incoming.usage?.geminiCalls) || 0,
            sarvamCalls: Number(incoming.usage?.sarvamCalls) || 0,
            coachBookings: Number(incoming.usage?.coachBookings) || 0,
            periodStart: Number(incoming.usage?.periodStart) || monthStart(),
        },
    };
}

export function getPlanLimits(plan = "Free Tier") {
    const isPro = /pro|elite|enterprise/i.test(plan);
    return {
        gemini: isPro ? PRO_GEMINI_MONTHLY : FREE_GEMINI_MONTHLY,
        sarvam: isPro ? PRO_SARVAM_MONTHLY : FREE_SARVAM_MONTHLY,
        coach: isPro ? 20 : 2,
        unlimitedMocks: isPro,
        coachesUnlocked: isPro,
    };
}

export function mergePrepProgress(
    cloud?: PrepProgressBlob | null,
    local?: PrepProgressBlob | null
): PrepProgressBlob {
    const a = ensurePrepProgressShape(cloud);
    const b = ensurePrepProgressShape(local);
    return {
        starHistory: mergeStarHistory(a.starHistory, b.starHistory),
        codingProgress: mergeCodingProgress(a.codingProgress, b.codingProgress),
        atsMatchPercent:
            (b.atsLastAt || 0) >= (a.atsLastAt || 0)
                ? b.atsMatchPercent ?? a.atsMatchPercent
                : a.atsMatchPercent ?? b.atsMatchPercent,
        atsLastAt: Math.max(a.atsLastAt || 0, b.atsLastAt || 0) || undefined,
        domainPackId: b.domainPackId || a.domainPackId,
        referralCredits: Math.max(a.referralCredits || 0, b.referralCredits || 0),
        usage: {
            geminiCalls: Math.max(a.usage?.geminiCalls || 0, b.usage?.geminiCalls || 0),
            sarvamCalls: Math.max(a.usage?.sarvamCalls || 0, b.usage?.sarvamCalls || 0),
            coachBookings: Math.max(a.usage?.coachBookings || 0, b.usage?.coachBookings || 0),
            periodStart: Math.min(
                a.usage?.periodStart || monthStart(),
                b.usage?.periodStart || monthStart()
            ),
        },
    };
}

export async function ensurePrepProgress(identifier: string) {
    await connectDB();
    let blob = await CloudSession.findOne({ identifier });
    if (!blob) {
        blob = await CloudSession.create({
            identifier,
            sessions: [],
            prepPacks: [],
            spacedDrills: [],
            prepProgress: emptyPrepProgress(),
        });
    }
    if (!blob.prepProgress) {
        blob.prepProgress = emptyPrepProgress();
        await blob.save();
    }
    const usage = blob.prepProgress.usage;
    if (usage && usage.periodStart < monthStart()) {
        usage.geminiCalls = 0;
        usage.sarvamCalls = 0;
        usage.coachBookings = 0;
        usage.periodStart = monthStart();
        blob.markModified("prepProgress");
        await blob.save();
    }
    return blob;
}

export type MeterKind = "gemini" | "sarvam" | "coach";

export async function checkAndIncrementUsage(
    identifier: string,
    kind: MeterKind,
    plan = "Free Tier"
): Promise<{ allowed: boolean; remaining: number; limit: number; retryAfterSec?: number }> {
    const blob = await ensurePrepProgress(identifier);
    const limits = getPlanLimits(plan);
    const usage = blob.prepProgress.usage || {
        geminiCalls: 0,
        sarvamCalls: 0,
        coachBookings: 0,
        periodStart: monthStart(),
    };
    const key = kind === "gemini" ? "geminiCalls" : kind === "sarvam" ? "sarvamCalls" : "coachBookings";
    const limit = kind === "gemini" ? limits.gemini : kind === "sarvam" ? limits.sarvam : limits.coach;
    const used = usage[key] || 0;
    if (used >= limit) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        return {
            allowed: false,
            remaining: 0,
            limit,
            retryAfterSec: Math.max(60, Math.floor((nextMonth.getTime() - Date.now()) / 1000)),
        };
    }
    usage[key] = used + 1;
    blob.prepProgress.usage = usage;
    blob.markModified("prepProgress");
    await blob.save();
    return { allowed: true, remaining: limit - used - 1, limit };
}

export async function addReferralCredits(identifier: string, amount: number) {
    const blob = await ensurePrepProgress(identifier);
    blob.prepProgress.referralCredits = (blob.prepProgress.referralCredits || 0) + amount;
    blob.markModified("prepProgress");
    await blob.save();
    return blob.prepProgress.referralCredits || 0;
}

export async function pushNotification(input: {
    userIdentifier: string;
    kind: "prep" | "coach" | "gmail" | "referral" | "system";
    title: string;
    body: string;
    href?: string;
}) {
    try {
        await connectDB();
        await Notification.create(input);
    } catch (e) {
        console.warn("pushNotification failed", e);
    }
}

export function mergeStarHistory(cloud: unknown[], local: unknown[], max = 5): unknown[] {
    const map = new Map<string, Record<string, unknown>>();
    for (const item of [...(cloud || []), ...(local || [])]) {
        if (!item || typeof item !== "object") continue;
        const e = item as Record<string, unknown>;
        const key = String(e.id || `${e.question}_${e.savedAt}`);
        const existing = map.get(key);
        if (!existing || Number(e.savedAt || 0) >= Number(existing.savedAt || 0)) {
            map.set(key, e);
        }
    }
    return Array.from(map.values())
        .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))
        .slice(0, max);
}

export function mergeCodingProgress(
    cloud: { solvedIds?: string[]; bestScores?: Record<string, number>; lastProblemId?: string },
    local: { solvedIds?: string[]; bestScores?: Record<string, number>; lastProblemId?: string }
) {
    const bestScores = { ...(cloud?.bestScores || {}) };
    for (const [k, v] of Object.entries(local?.bestScores || {})) {
        bestScores[k] = Math.max(bestScores[k] || 0, Number(v) || 0);
    }
    const solvedIds = Array.from(
        new Set([...(cloud?.solvedIds || []), ...(local?.solvedIds || [])])
    );
    return {
        solvedIds,
        bestScores,
        lastProblemId: local?.lastProblemId || cloud?.lastProblemId,
    };
}
