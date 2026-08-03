import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import SyntheticFile from "@/models/SyntheticFile";
import { getVerifiedSession } from "@/utils/auth";

function getUserId(req: NextRequest, session: any): string {
    return session?.identifier || req.headers.get("x-user-identifier") || "guest_user";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await getVerifiedSession();
        const userId = getUserId(req, session);
        const body = await req.json();

        const file = await SyntheticFile.findById(id);
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Only owner can change visibility
        if (file.userId !== userId) {
            return NextResponse.json({ error: "Permission Denied: Only the file owner can change file visibility." }, { status: 403 });
        }

        const newVisibility = body.visibility === "public" ? "public" : "private";
        file.visibility = newVisibility;
        await file.save();

        return NextResponse.json({ success: true, visibility: file.visibility, _id: file._id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to update file visibility" }, { status: 500 });
    }
}
