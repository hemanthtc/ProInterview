import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { createExam } from "@/utils/examStore";
import { pickAssessmentProblems, mulberry32 } from "@/utils/pickAssessmentProblems";
import { recordAnalyticsEvent } from "@/utils/analytics";

/** Creates a sample faculty exam so exhibition demos never start empty. */
export async function POST() {
    const session = await getVerifiedSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const allowSeed =
        process.env.NODE_ENV !== "production" ||
        process.env.ALLOW_DEMO_SEED === "1" ||
        session.role === "admin";
    if (!allowSeed) {
        return NextResponse.json(
            { error: "Demo seed is disabled in production. Create an exam from Faculty instead." },
            { status: 403 }
        );
    }
    const problems = pickAssessmentProblems(3, mulberry32(2026));
    let exam;
    try {
        exam = await createExam({
            title: "Demo campus drive",
            createdBy: session.identifier,
            durationSec: 45 * 60,
            problemIds: problems.map((p) => p.id),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Could not seed demo exam.";
        return NextResponse.json({ error: message }, { status: 503 });
    }
    recordAnalyticsEvent({ name: "exam_created", at: Date.now(), identifier: session.identifier });
    return NextResponse.json({
        exam,
        joinPath: `/coding-assessment?exam=${exam.code}`,
        hint: "Use this join code on a second browser as the student.",
    });
}
