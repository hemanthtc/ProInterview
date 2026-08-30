import connectDB from "@/utils/db";
import CodingExam, { type ICodingExamAttempt } from "@/models/CodingExam";

export interface ExamAttemptView {
    identifier: string;
    displayName: string;
    startedAt: number;
    submittedAt?: number;
    terminated?: boolean;
    scores: Record<string, number>;
    events: { at: number; reason: string }[];
}

export interface ExamRecord {
    code: string;
    title: string;
    createdBy: string;
    durationSec: number;
    problemIds: string[];
    createdAt: number;
    attempts: ExamAttemptView[];
}

const memory = new Map<string, ExamRecord>();

function makeCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function toView(doc: {
    code: string;
    title: string;
    createdBy: string;
    durationSec: number;
    problemIds: string[];
    createdAt: Date;
    attempts: ICodingExamAttempt[];
}): ExamRecord {
    return {
        code: doc.code,
        title: doc.title,
        createdBy: doc.createdBy,
        durationSec: doc.durationSec,
        problemIds: doc.problemIds,
        createdAt: new Date(doc.createdAt).getTime(),
        attempts: (doc.attempts || []).map((a) => ({
            identifier: a.identifier,
            displayName: a.displayName,
            startedAt: a.startedAt,
            submittedAt: a.submittedAt,
            terminated: a.terminated,
            scores: a.scores || {},
            events: a.events || [],
        })),
    };
}

async function tryMongo<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
        await connectDB();
        return await fn();
    } catch {
        return null;
    }
}

export async function createExam(input: {
    title: string;
    createdBy: string;
    durationSec: number;
    problemIds: string[];
}): Promise<ExamRecord> {
    let code = makeCode();
    const record: ExamRecord = {
        code,
        title: input.title.slice(0, 80) || "Campus coding exam",
        createdBy: input.createdBy,
        durationSec: Math.min(3 * 60 * 60, Math.max(10 * 60, input.durationSec || 3600)),
        problemIds: input.problemIds,
        createdAt: Date.now(),
        attempts: [],
    };

    const saved = await tryMongo(async () => {
        for (let i = 0; i < 5; i++) {
            const exists = await CodingExam.findOne({ code }).lean();
            if (!exists) break;
            code = makeCode();
            record.code = code;
        }
        const doc = await CodingExam.create({
            code: record.code,
            title: record.title,
            createdBy: record.createdBy,
            durationSec: record.durationSec,
            problemIds: record.problemIds,
            attempts: [],
        });
        return toView(doc);
    });

    const finalRecord = saved || record;
    memory.set(finalRecord.code, finalRecord);
    return finalRecord;
}

export async function getExam(code: string): Promise<ExamRecord | null> {
    const key = code.trim().toUpperCase();
    const fromDb = await tryMongo(async () => {
        const doc = await CodingExam.findOne({ code: key }).lean();
        return doc ? toView(doc) : null;
    });
    if (fromDb) {
        memory.set(key, fromDb);
        return fromDb;
    }
    return memory.get(key) || null;
}

export async function listExams(createdBy: string): Promise<ExamRecord[]> {
    const fromDb = await tryMongo(async () => {
        const docs = await CodingExam.find({ createdBy }).sort({ createdAt: -1 }).limit(40).lean();
        return docs.map((d) => toView(d));
    });
    if (fromDb) return fromDb;
    return [...memory.values()].filter((e) => e.createdBy === createdBy).sort((a, b) => b.createdAt - a.createdAt);
}

export async function upsertAttempt(
    code: string,
    identifier: string,
    patch: Partial<ExamAttemptView> & { displayName?: string }
): Promise<ExamRecord | null> {
    const exam = await getExam(code);
    if (!exam) return null;

    const existing = exam.attempts.find((a) => a.identifier === identifier);
    const next: ExamAttemptView = {
        identifier,
        displayName: patch.displayName || existing?.displayName || "Student",
        startedAt: existing?.startedAt || Date.now(),
        submittedAt: patch.submittedAt ?? existing?.submittedAt,
        terminated: patch.terminated ?? existing?.terminated,
        scores: { ...(existing?.scores || {}), ...(patch.scores || {}) },
        events: [...(existing?.events || []), ...(patch.events || [])].slice(-40),
    };

    const attempts = existing
        ? exam.attempts.map((a) => (a.identifier === identifier ? next : a))
        : [...exam.attempts, next];
    const updated = { ...exam, attempts };
    memory.set(exam.code, updated);

    await tryMongo(async () => {
        await CodingExam.updateOne(
            { code: exam.code },
            { $set: { attempts } }
        );
        return true;
    });

    return updated;
}
