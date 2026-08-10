import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    canReadFolder,
    serializeFile,
    serializeFolder,
    SyntheticFolder,
    SyntheticFile,
} from "@/lib/syntheticAccess";

type Ctx = { params: Promise<{ id: string }> };

function collectDescendantIds(folders: any[], rootId: string): Set<string> {
    const ids = new Set([rootId]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const f of folders) {
            const id = String(f._id || f.id);
            const parentId = f.parentId ? String(f.parentId) : null;
            if (parentId && ids.has(parentId) && !ids.has(id)) {
                ids.add(id);
                changed = true;
            }
        }
    }
    return ids;
}

export async function GET(req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const userId = auth.session.identifier;
        const recursive = req.nextUrl.searchParams.get("recursive") === "true";

        if (id === "root") {
            const files = await SyntheticFile.find({
                userId,
                $or: [{ folderId: null }, { folderId: "" }],
            }).lean();
            return NextResponse.json({
                folder: { id: "root", name: "Root", parentId: null },
                path: "Root",
                files: files.map((f) => serializeFile(f, userId)),
            });
        }

        const folder = await SyntheticFolder.findById(id).lean();
        if (!folder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }
        if (!canReadFolder(folder as any, userId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const allFolders = await SyntheticFolder.find({ userId }).lean();

        let folderIds: Set<string>;
        if (recursive) {
            folderIds = collectDescendantIds(allFolders, id);
        } else {
            folderIds = new Set([id]);
        }

        // Only the owner's files inside their folders (public peer files are listed flat via /files?scope=all)
        const files = await SyntheticFile.find({
            userId,
            folderId: { $in: Array.from(folderIds) },
        }).lean();

        const pathParts: string[] = [];
        let current: any = folder;
        const guard = new Set<string>();
        while (current && !guard.has(String(current._id))) {
            guard.add(String(current._id));
            pathParts.unshift(current.name);
            current = allFolders.find((f) => String(f._id) === String(current.parentId));
        }

        return NextResponse.json({
            folder: serializeFolder(folder, userId),
            path: pathParts.join("/") || "Root",
            files: files.map((f) => serializeFile(f, userId)),
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to load folder files" },
            { status: 500 }
        );
    }
}
