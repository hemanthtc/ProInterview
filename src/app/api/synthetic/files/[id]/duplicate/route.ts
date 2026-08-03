import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import SyntheticFile from "@/models/SyntheticFile";
import { getVerifiedSession } from "@/utils/auth";

function getUserId(req: NextRequest, session: any): { userId: string; ownerName: string } {
    const userId = session?.identifier || req.headers.get("x-user-identifier") || "guest_user";
    const ownerName = req.headers.get("x-user-name") || session?.identifier?.split("@")[0] || "Anonymous";
    return { userId, ownerName };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await getVerifiedSession();
        const { userId, ownerName } = getUserId(req, session);
        const body = await req.json().catch(() => ({}));

        const original = await SyntheticFile.findById(id);
        if (!original) {
            return NextResponse.json({ error: "Original file not found" }, { status: 404 });
        }

        // Access check: User must own the file OR the file must be public
        if (original.userId !== userId && original.visibility !== "public") {
            return NextResponse.json({ error: "Access Denied: Cannot duplicate private file owned by another user." }, { status: 403 });
        }

        const isFork = original.userId !== userId;
        const newTitle = isFork ? `${original.title} (Fork)` : `${original.title} (Copy)`;
        const newFilename = `${newTitle.toLowerCase().replace(/\s+/g, '_')}.${original.fileType}`;

        const duplicated = await SyntheticFile.create({
            userId,
            ownerName,
            visibility: "private", // Duplicated copies are private to the duplicator by default
            folderId: body.folderId !== undefined ? body.folderId : (isFork ? null : original.folderId),
            parentId: original.parentId,
            title: newTitle,
            filename: newFilename,
            language: original.language,
            fileType: original.fileType,
            contentType: original.contentType,
            format: original.format,
            rowCount: original.rowCount,
            data: original.data,
            schema: original.schema,
            textContent: original.textContent,
            topic: original.topic,
            originalPrompt: original.originalPrompt,
            aiModel: original.aiModel,
            source: isFork ? "forked" : "duplicated",
            favorite: false,
            pinned: false,
            description: original.description,
            tags: original.tags,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sizeBytes: original.sizeBytes,
        });

        return NextResponse.json(duplicated, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to duplicate file" }, { status: 500 });
    }
}
