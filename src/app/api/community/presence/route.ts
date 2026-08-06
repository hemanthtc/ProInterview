import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { memOnline, memTouchPresence } from "@/utils/communityStore";
import connectDB from "@/utils/db";
import User from "@/models/User";

/** Heartbeat + list of students currently online in community */
export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (session) {
            let displayName = session.identifier.split("@")[0] || "Student";
            try {
                await connectDB();
                const user = await User.findOne({ identifier: session.identifier }).lean();
                if (user?.displayName) displayName = user.displayName;
            } catch {
                /* ignore */
            }
            memTouchPresence({
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
            });
        }

        const online = memOnline().map((p) => ({
            identifier: p.identifier,
            displayName: p.displayName,
            roomSlug: p.roomSlug || null,
        }));

        return NextResponse.json({ online, count: online.length });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load presence";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { roomSlug, displayName } = await req.json().catch(() => ({}));
        let name = typeof displayName === "string" && displayName.trim() ? displayName.trim() : "";
        if (!name) {
            try {
                await connectDB();
                const user = await User.findOne({ identifier: session.identifier }).lean();
                name = user?.displayName || session.identifier.split("@")[0] || "Student";
            } catch {
                name = session.identifier.split("@")[0] || "Student";
            }
        }

        memTouchPresence({
            identifier: session.identifier,
            displayName: name.slice(0, 80),
            lastSeen: Date.now(),
            roomSlug: typeof roomSlug === "string" ? roomSlug : undefined,
        });

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update presence";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
