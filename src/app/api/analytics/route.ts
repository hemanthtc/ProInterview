import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { analyticsFunnel, listAnalyticsEvents, recordAnalyticsEvent, type AnalyticsEventName } from "@/utils/analytics";

const NAMES: AnalyticsEventName[] = [
    "signup",
    "interview_finished",
    "assessment_submitted",
    "exam_created",
    "job_tracked",
    "aptitude_scored",
];

function isName(value: string): value is AnalyticsEventName {
    return (NAMES as string[]).includes(value);
}

export async function GET() {
    const session = await getVerifiedSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ funnel: analyticsFunnel(), events: listAnalyticsEvents().slice(0, 80) });
}

export async function POST(req: NextRequest) {
    const session = await getVerifiedSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "");
    if (!isName(name)) return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    recordAnalyticsEvent({
        name,
        at: Date.now(),
        identifier: session.identifier,
        meta: body.meta && typeof body.meta === "object" ? body.meta : undefined,
    });
    return NextResponse.json({ ok: true, funnel: analyticsFunnel() });
}
