import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";

const reports: { at: number; reporter: string; messageId: string; reason: string }[] = [];

export async function POST(req: NextRequest) {
    const session = await getVerifiedSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`community-report:${session.identifier}`, { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    const messageId = String(body.messageId || "").slice(0, 80);
    const reason = String(body.reason || "abuse").slice(0, 200);
    if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });
    reports.push({ at: Date.now(), reporter: session.identifier, messageId, reason });
    return NextResponse.json({ ok: true });
}

export async function GET() {
    const session = await getVerifiedSession();
    if (!session || session.role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    return NextResponse.json({ reports: reports.slice(-100).reverse() });
}
