import { NextResponse } from "next/server";
import { getVerifiedSession, setSessionCookie, verifyTokenMeta } from "@/utils/auth";

/** Rotates the session cookie when it is still valid (sliding expiry). */
export async function POST() {
    const session = await getVerifiedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await setSessionCookie(session);
    const meta = await verifyTokenMeta();
    return NextResponse.json({ ok: true, expiresAt: meta?.exp || null });
}
