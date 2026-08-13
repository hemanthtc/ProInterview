import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import connectDB from "@/utils/db";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
        const query: Record<string, unknown> = { userIdentifier: session.identifier };
        if (unreadOnly) query.read = false;

        const items = await Notification.find(query).sort({ createdAt: -1 }).limit(25).lean();
        const unreadCount = await Notification.countDocuments({
            userIdentifier: session.identifier,
            read: false,
        });

        return NextResponse.json({ notifications: items, unreadCount });
    } catch (error: unknown) {
        console.error("notifications GET error:", error);
        const message = error instanceof Error ? error.message : "Failed to load notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        await connectDB();

        if (body?.markAllRead) {
            await Notification.updateMany(
                { userIdentifier: session.identifier, read: false },
                { $set: { read: true } }
            );
            return NextResponse.json({ success: true });
        }

        const id = typeof body?.id === "string" ? body.id : "";
        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        await Notification.updateOne(
            { _id: id, userIdentifier: session.identifier },
            { $set: { read: true } }
        );
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("notifications PATCH error:", error);
        const message = error instanceof Error ? error.message : "Failed to update notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const id = req.nextUrl.searchParams.get("id");
        if (id) {
            await Notification.deleteOne({ _id: id, userIdentifier: session.identifier });
        } else {
            await Notification.deleteMany({ userIdentifier: session.identifier });
        }
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("notifications DELETE error:", error);
        const message = error instanceof Error ? error.message : "Failed to clear notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
