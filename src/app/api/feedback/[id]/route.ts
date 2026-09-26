import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Feedback from "@/models/Feedback";
import { getVerifiedSession } from "@/utils/auth";
import User from "@/models/User";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = session.role === "admin" || (session as any).isAdmin === true;
        if (!isAdmin) {
            return NextResponse.json({ error: "Admin privilege required to reply to feedback." }, { status: 403 });
        }

        const { id } = await context.params;
        const body = await req.json();
        const { replyText, status } = body;

        await connectDB();

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
        }

        // Get admin display name
        let adminName = "Platform Admin";
        try {
            const adminDoc = await User.findOne({ identifier: session.identifier });
            if (adminDoc?.displayName) {
                adminName = adminDoc.displayName;
            }
        } catch { /* ignore */ }

        if (replyText && typeof replyText === "string" && replyText.trim()) {
            feedback.adminReply = {
                replyText: replyText.trim(),
                repliedAt: new Date(),
                repliedBy: session.identifier.toLowerCase(),
                adminName,
            };
            feedback.status = status || "replied";
        } else if (status) {
            feedback.status = status;
        }

        await feedback.save();

        return NextResponse.json({
            success: true,
            feedback,
            message: "Feedback response updated successfully.",
        });
    } catch (err: any) {
        console.error("PATCH /api/feedback/[id] error:", err);
        return NextResponse.json({ error: err.message || "Failed to update feedback response." }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        await connectDB();

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
        }

        const isAdmin = session.role === "admin" || (session as any).isAdmin === true;
        const isOwner = feedback.userIdentifier.toLowerCase() === session.identifier.toLowerCase();

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: "Insufficient permissions to delete this feedback." }, { status: 403 });
        }

        await Feedback.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Feedback entry deleted successfully.",
        });
    } catch (err: any) {
        console.error("DELETE /api/feedback/[id] error:", err);
        return NextResponse.json({ error: err.message || "Failed to delete feedback entry." }, { status: 500 });
    }
}
