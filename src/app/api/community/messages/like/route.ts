import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { presencePublicId } from "@/utils/community";
import { isS3Configured, s3LikeMessage } from "@/utils/s3Community";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Sign in to like messages." }, { status: 401 });
        }

        const { roomSlug, messageId } = await req.json();
        if (!roomSlug || !messageId) {
            return NextResponse.json({ error: "roomSlug and messageId are required" }, { status: 400 });
        }

        // Toggle like status
        if (isS3Configured()) {
            const userPublicId = presencePublicId(session.identifier);
            const success = await s3LikeMessage(roomSlug, messageId, userPublicId);
            if (success) {
                return NextResponse.json({ success: true });
            }
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        // Ephemeral / Local fallback (S3 not configured)
        // We can just return success or update memory store if needed. Since memory store is dev-only, we return success.
        return NextResponse.json({ success: true, warning: "S3 not configured, like recorded as stub" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to toggle message like";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
