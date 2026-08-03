import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import SyntheticFolder from "@/models/SyntheticFolder";
import SyntheticFile from "@/models/SyntheticFile";
import { getVerifiedSession } from "@/utils/auth";

function getUserId(req: NextRequest, session: any): string {
    if (session?.identifier) return session.identifier;
    const headerId = req.headers.get("x-user-identifier");
    return headerId || "guest_user";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await getVerifiedSession();
        const userId = getUserId(req, session);
        const body = await req.json();

        const folder = await SyntheticFolder.findOne({ _id: id, userId });
        if (!folder) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        if (body.name !== undefined) folder.name = String(body.name).trim();
        if (body.parentId !== undefined) folder.parentId = body.parentId || null;
        if (body.favorite !== undefined) folder.favorite = Boolean(body.favorite);
        if (body.description !== undefined) folder.description = String(body.description);

        await folder.save();
        return NextResponse.json(folder);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to update folder" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await getVerifiedSession();
        const userId = getUserId(req, session);

        const folder = await SyntheticFolder.findOne({ _id: id, userId });
        if (!folder) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        // Delete folder and child files / subfolders owned by user
        await SyntheticFolder.deleteOne({ _id: id, userId });
        await SyntheticFolder.deleteMany({ parentId: id, userId });
        await SyntheticFile.deleteMany({ folderId: id, userId });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to delete folder" }, { status: 500 });
    }
}
