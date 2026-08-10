import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    canWriteFolder,
    serializeFolder,
    findSiblingFolderConflict,
    siblingFolderConflictMessage,
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

export async function PUT(req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const folder = await SyntheticFolder.findById(id);
        if (!folder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }
        if (!canWriteFolder(folder, auth.session.identifier)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const nextName =
            body.name !== undefined ? String(body.name).trim().slice(0, 120) : folder.name;
        const nextParentId =
            body.parentId !== undefined ? body.parentId || null : folder.parentId || null;

        if (body.parentId !== undefined) {
            if (nextParentId === id) {
                return NextResponse.json({ error: "Invalid parent folder" }, { status: 400 });
            }
            if (nextParentId) {
                const parent = await SyntheticFolder.findById(nextParentId);
                if (!parent || parent.userId !== auth.session.identifier) {
                    return NextResponse.json({ error: "Parent folder not found" }, { status: 400 });
                }
                if ((parent.type || "tabular") !== (folder.type || "tabular")) {
                    return NextResponse.json(
                        { error: "Folder type must match parent folder type" },
                        { status: 400 }
                    );
                }
            }
        }

        if (body.name !== undefined || body.parentId !== undefined) {
            if (!nextName) {
                return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
            }
            const conflict = await findSiblingFolderConflict({
                userId: auth.session.identifier,
                parentId: nextParentId,
                type: folder.type === "document" ? "document" : "tabular",
                name: nextName,
                excludeId: id,
            });
            if (conflict) {
                return NextResponse.json(
                    {
                        error: siblingFolderConflictMessage(
                            folder.type === "document" ? "document" : "tabular",
                            nextName
                        ),
                    },
                    { status: 409 }
                );
            }
        }

        if (body.name !== undefined) folder.name = nextName;
        if (body.description !== undefined) folder.description = String(body.description);
        if (body.favorite !== undefined) folder.favorite = Boolean(body.favorite);
        // Folders are always private — public sharing is file-level only
        folder.visibility = "private";
        if (body.parentId !== undefined) {
            folder.parentId = nextParentId;
        }
        folder.modifiedAt = new Date();
        await folder.save();
        return NextResponse.json(serializeFolder(folder, auth.session.identifier));
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update folder" },
            { status: 400 }
        );
    }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const folder = await SyntheticFolder.findById(id);
        if (!folder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }
        if (!canWriteFolder(folder, auth.session.identifier)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const deleteFiles = req.nextUrl.searchParams.get("deleteFiles") !== "false";
        const allFolders = await SyntheticFolder.find({ userId: auth.session.identifier }).lean();
        const descendantIds = collectDescendantIds(allFolders, id);

        await SyntheticFolder.deleteMany({
            _id: { $in: Array.from(descendantIds) },
            userId: auth.session.identifier,
        });

        let removedFiles = 0;
        if (deleteFiles) {
            const result = await SyntheticFile.deleteMany({
                userId: auth.session.identifier,
                folderId: { $in: Array.from(descendantIds) },
            });
            removedFiles = result.deletedCount || 0;
        } else {
            await SyntheticFile.updateMany(
                {
                    userId: auth.session.identifier,
                    folderId: { $in: Array.from(descendantIds) },
                },
                { $set: { folderId: null } }
            );
        }

        return NextResponse.json({
            ok: true,
            removedFolders: descendantIds.size,
            removedFiles,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to delete folder" },
            { status: 500 }
        );
    }
}
