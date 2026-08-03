import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    getOwnerName,
    serializeFolder,
    findSiblingFolderConflict,
    siblingFolderConflictMessage,
    SyntheticFolder,
    SyntheticFile,
} from "@/lib/syntheticAccess";

export async function GET(req: NextRequest) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const userId = auth.session.identifier;

        // Folders are never shared publicly — only the owner's private folder tree.
        // Public sharing is file-level only (see files API + serializeFile).
        const folders = await SyntheticFolder.find({ userId }).sort({ name: 1 }).lean();
        const files = await SyntheticFile.find({ userId })
            .select("folderId sizeBytes userId")
            .lean();

        const enriched = folders.map((folder) => {
            const id = String(folder._id);
            const folderFiles = files.filter((f) => f.folderId === id);
            const childFolders = folders.filter((f) => f.parentId === id).length;
            return serializeFolder(folder, userId, {
                totalFiles: folderFiles.length,
                totalSize: folderFiles.reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0),
                childFolders,
            });
        });

        return NextResponse.json(enriched);
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to list folders" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const body = await req.json();
        const name = String(body?.name || "").trim();
        if (!name) {
            return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
        }

        const userId = auth.session.identifier;
        const ownerName = await getOwnerName(userId);
        let folderType = body?.type === "document" ? "document" : "tabular";
        const parentId = body?.parentId || null;

        if (parentId) {
            const parent = await SyntheticFolder.findById(parentId);
            if (!parent || parent.userId !== userId) {
                return NextResponse.json({ error: "Parent folder not found" }, { status: 400 });
            }
            folderType = parent.type === "document" ? "document" : "tabular";
        }

        const cleanName = name.slice(0, 120);
        const conflict = await findSiblingFolderConflict({
            userId,
            parentId,
            type: folderType,
            name: cleanName,
        });
        if (conflict) {
            return NextResponse.json(
                { error: siblingFolderConflictMessage(folderType, cleanName) },
                { status: 409 }
            );
        }

        const created = await SyntheticFolder.create({
            userId,
            ownerName,
            name: cleanName,
            parentId,
            type: folderType,
            visibility: "private",
            favorite: Boolean(body?.favorite),
            description: body?.description || "",
            modifiedAt: new Date(),
        });

        return NextResponse.json(serializeFolder(created, userId), { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to create folder" },
            { status: 400 }
        );
    }
}
