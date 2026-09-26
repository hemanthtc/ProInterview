import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { presencePublicId, sanitizeDisplayName } from "@/utils/community";
import { memOnline, memTouchPresence } from "@/utils/communityStore";
import connectDB from "@/utils/db";
import User from "@/models/User";

async function resolveDisplayName(identifier: string): Promise<string> {
    const fallback = sanitizeDisplayName(identifier.split("@")[0] || "Student");
    try {
        await connectDB();
        const user = await User.findOne({ identifier }).lean();
        if (user?.displayName) return sanitizeDisplayName(user.displayName, fallback);
    } catch {
        /* ignore */
    }
    return fallback;
}

/** Heartbeat + list of students currently online in community (auth required, no emails). */
export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const displayName = await resolveDisplayName(session.identifier);
        const mePublicId = presencePublicId(session.identifier);
        memTouchPresence(
            {
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
            },
            mePublicId
        );

        const online = memOnline().map((p) => {
            const publicId = presencePublicId(p.identifier);
            return {
                publicId,
                displayName: p.displayName,
                roomSlug: p.roomSlug || null,
                isSelf: publicId === mePublicId,
            };
        });

        return NextResponse.json({
            me: { publicId: mePublicId, displayName },
            online,
            count: online.length,
        });
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

        const { roomSlug } = await req.json().catch(() => ({}));
        // Ignore client-supplied displayName — always resolve server-side to prevent spoofing.
        const displayName = await resolveDisplayName(session.identifier);
        const publicId = presencePublicId(session.identifier);

        memTouchPresence(
            {
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
                roomSlug: typeof roomSlug === "string" ? roomSlug : undefined,
            },
            publicId
        );

        return NextResponse.json({ ok: true, publicId, displayName });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update presence";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
