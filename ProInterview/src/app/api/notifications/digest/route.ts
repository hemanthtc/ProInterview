import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Notification from "@/models/Notification";
import { getVerifiedSession } from "@/utils/auth";
import { sendDigestEmail } from "@/utils/mailer";

export const dynamic = "force-dynamic";

const MAX_USERS = 50;

async function isAuthorized(req: NextRequest): Promise<boolean> {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get("x-cron-secret");
    if (cronSecret && headerSecret && headerSecret === cronSecret) return true;

    const session = await getVerifiedSession();
    return Boolean(session && session.role === "admin");
}

/**
 * POST — emails an unread-notifications digest to users with unread items (email identifiers only).
 * Callable by an admin session or a cron job presenting the shared CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
    try {
        if (!(await isAuthorized(req))) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        await connectDB();

        const grouped = await Notification.aggregate([
            { $match: { read: false } },
            { $group: { _id: "$userIdentifier", unread: { $sum: 1 } } },
            { $match: { unread: { $gt: 0 } } },
            { $limit: MAX_USERS },
        ]);

        let digestsSent = 0;
        let skipped = 0;

        for (const group of grouped) {
            const userIdentifier = String(group._id || "");
            if (!userIdentifier.includes("@")) {
                skipped += 1;
                continue;
            }

            const notifications = await Notification.find({ userIdentifier, read: false })
                .sort({ createdAt: -1 })
                .limit(10)
                .select("title body href")
                .lean();

            const sent = await sendDigestEmail(
                userIdentifier,
                notifications.map((n) => ({ title: n.title, body: n.body, href: n.href }))
            );
            if (sent) digestsSent += 1;
        }

        return NextResponse.json({
            success: true,
            usersWithUnread: grouped.length,
            digestsSent,
            skipped,
        });
    } catch (error: unknown) {
        console.error("notifications digest POST error:", error);
        const message = error instanceof Error ? error.message : "Failed to send digest";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
