import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { createExam, getExam, listExams, upsertAttempt } from "@/utils/examStore";
import { getProblemPublic } from "@/data/codingProblems";
import { pickAssessmentProblems, mulberry32 } from "@/utils/pickAssessmentProblems";
import { rateLimit } from "@/utils/rateLimit";
import { assertProOrLimit } from "@/utils/requirePro";
import { recordAnalyticsEvent } from "@/utils/analytics";
import { CODING_PROBLEMS } from "@/data/codingProblems";

function examPublic(exam: { code: string; title: string; durationSec: number; problemIds: string[] }) {
    return {
        code: exam.code,
        title: exam.title,
        durationSec: exam.durationSec,
        problems: exam.problemIds.map((id) => getProblemPublic(id)).filter(Boolean),
    };
}

export async function GET(req: NextRequest) {
    const session = await getVerifiedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
    }
    const code = new URL(req.url).searchParams.get("code");
    if (code) {
        const exam = await getExam(code);
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        const isOwner = exam.createdBy === session.identifier || session.role === "admin";
        return NextResponse.json({
            exam: {
                ...examPublic(exam),
                ...(isOwner ? { attempts: exam.attempts, createdBy: exam.createdBy } : {}),
            },
        });
    }
    const exams = await listExams(session.identifier);
    return NextResponse.json({ exams });
}

export async function POST(req: NextRequest) {
    const session = await getVerifiedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
    }
    const rl = rateLimit(`exam-write:${session.identifier}`, { limit: 40, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
        return NextResponse.json({ error: `Rate limited. Retry in ${rl.retryAfterSec}s.` }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "create");

    if (action === "create") {
        const existing = await listExams(session.identifier);
        const gate = await assertProOrLimit(session, existing.length, 3);
        if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 402 });
        const requested = Array.isArray(body.problemIds)
            ? (body.problemIds as unknown[]).map(String).filter((id) => CODING_PROBLEMS.some((p) => p.id === id))
            : [];
        const count = Math.min(4, Math.max(2, Number(body.problemCount) || 3));
        const seed = Number(body.seed) || Date.now() % 100000;
        const picked = requested.length ? requested : pickAssessmentProblems(count, mulberry32(seed)).map((p) => p.id);
        const roster = String(body.roster || "")
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        const exam = await createExam({
            title: String(body.title || "Campus coding exam"),
            createdBy: session.identifier,
            durationSec: Number(body.durationSec) || 3600,
            problemIds: picked.slice(0, 4),
            roster,
        });
        recordAnalyticsEvent({ name: "exam_created", at: Date.now(), identifier: session.identifier });
        return NextResponse.json({ exam: { ...exam, joinPath: `/coding-assessment?exam=${exam.code}` } });
    }

    if (action === "join") {
        const exam = await getExam(String(body.code || ""));
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        await upsertAttempt(exam.code, session.identifier, {
            displayName: String(body.displayName || session.identifier),
        });
        return NextResponse.json({ exam: examPublic(exam) });
    }

    if (action === "report") {
        const exam = await getExam(String(body.code || ""));
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        const events = Array.isArray(body.events)
            ? body.events
                  .filter((e: { at?: number; reason?: string }) => e && typeof e.reason === "string")
                  .slice(0, 20)
                  .map((e: { at?: number; reason: string }) => ({
                      at: Number(e.at) || Date.now(),
                      reason: String(e.reason).slice(0, 200),
                  }))
            : [];
        const scores =
            body.scores && typeof body.scores === "object"
                ? Object.fromEntries(
                      Object.entries(body.scores as Record<string, unknown>)
                          .filter(([, v]) => typeof v === "number")
                          .map(([k, v]) => [k, Number(v)])
                  )
                : {};
        const updated = await upsertAttempt(exam.code, session.identifier, {
            displayName: String(body.displayName || session.identifier),
            events,
            scores,
            terminated: Boolean(body.terminated),
            submittedAt: body.submitted ? Date.now() : undefined,
        });
        return NextResponse.json({ ok: true, attemptCount: updated?.attempts.length || 0 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
