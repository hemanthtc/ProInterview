import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    canReadFile,
    getOwnerName,
    serializeFile,
    SyntheticFile,
} from "@/lib/syntheticAccess";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const source = await SyntheticFile.findById(id).lean();
        if (!source) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        if (!canReadFile(source as any, auth.session.identifier)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const userId = auth.session.identifier;
        const ownerName = await getOwnerName(userId);
        const now = new Date();

        const copy = await SyntheticFile.create({
            userId,
            ownerName,
            visibility: "private",
            folderId: body?.folderId !== undefined ? body.folderId : null,
            title: `${source.title || source.filename} (Copy)`,
            filename: String(source.filename || "file").replace(/(\.[^.]+)?$/, "_copy$1"),
            topic: source.topic || "",
            fileType: source.fileType || "json",
            language: source.language || "JSON",
            contentType: source.contentType || "tabular",
            format: source.format || "json",
            data: Array.isArray(source.data) ? source.data : [],
            schemaFields: Array.isArray((source as any).schemaFields)
                ? (source as any).schemaFields
                : [],
            textContent: source.textContent || "",
            favorite: false,
            pinned: false,
            tags: Array.isArray(source.tags) ? [...source.tags, "duplicated"] : ["duplicated"],
            description: source.description || "",
            originalPrompt: source.originalPrompt || "",
            aiModel: source.aiModel || "gemini-2.0-flash",
            source: source.source || "generated",
            parentId: String(source._id),
            rowCount: Number(source.rowCount || 0),
            sizeBytes: Number(source.sizeBytes || 0),
            timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: now,
            modifiedAt: now,
        });

        return NextResponse.json(serializeFile(copy, userId), { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to duplicate file" },
            { status: 400 }
        );
    }
}
