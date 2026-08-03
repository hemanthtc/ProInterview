import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import SyntheticFile from "@/models/SyntheticFile";
import { getVerifiedSession } from "@/utils/auth";

function getUserId(req: NextRequest, session: any): string {
    return session?.identifier || req.headers.get("x-user-identifier") || "guest_user";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await getVerifiedSession();
        const userId = getUserId(req, session);

        const file = await SyntheticFile.findById(id);
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // ACCESS CONTROL: Allow if owner OR file is public
        if (file.userId !== userId && file.visibility !== "public") {
            return NextResponse.json({ error: "Access Denied: This file is private to another user." }, { status: 403 });
        }

        return NextResponse.json(file);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch file" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        // WRITE PERMISSION: Owner only
        if (file.userId !== userId) {
            return NextResponse.json({ error: "Permission Denied: Only the file owner can modify this file." }, { status: 403 });
        }

        // Apply updates
        const fields = [
            "title", "filename", "language", "fileType", "contentType", "format",
            "rowCount", "data", "schema", "textContent", "topic", "description",
            "tags", "favorite", "pinned", "folderId", "visibility"
        ];
        for (const field of fields) {
            if (body[field] !== undefined) {
                file[field] = body[field];
            }
        }

        await file.save();
        return NextResponse.json(file);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to update file" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await getVerifiedSession();
        const userId = getUserId(req, session);

        const file = await SyntheticFile.findById(id);
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // DELETE PERMISSION: Owner only
        if (file.userId !== userId) {
            return NextResponse.json({ error: "Permission Denied: Only the file owner can delete this file." }, { status: 403 });
        }

        await SyntheticFile.deleteOne({ _id: id });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to delete file" }, { status: 500 });
    }
}
