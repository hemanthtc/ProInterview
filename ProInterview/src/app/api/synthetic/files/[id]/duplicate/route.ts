import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    canReadFile,
    getOwnerName,
    serializeFile,
    SyntheticFile,
    hydrateFilePayload,
} from "@/lib/syntheticAccess";
import { copyObject, uploadJSON, isS3Configured } from "@/utils/s3";

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

        // Load S3 payload of source into memory first
        await hydrateFilePayload(source);

        const body = await req.json().catch(() => ({}));
        const userId = auth.session.identifier;
        const ownerName = await getOwnerName(userId);
        const now = new Date();

        const copyPayload = {
            userId,
            ownerName,
            visibility: "private" as const,
            folderId: body?.folderId !== undefined ? body.folderId : (source.folderId || null),
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
        };

        const copy = await SyntheticFile.create(copyPayload);

        if (isS3Configured()) {
            const copyId = String(copy._id);
            const copyS3Key = `synthetic/${userId}/${copyId}.json`;

            if (source.s3Key) {
                // Internal S3 duplication
                await copyObject(source.s3Key, copyS3Key);
            } else {
                // Upload MongoDB payload to S3
                const s3Payload = {
                    data: copyPayload.data,
                    textContent: copyPayload.textContent
                };
                await uploadJSON(copyS3Key, s3Payload);
            }

            copy.s3Key = copyS3Key;
            copy.data = [];
            copy.textContent = "";
            await copy.save();
        }

        const responseObj = await hydrateFilePayload(copy);
        return NextResponse.json(serializeFile(responseObj, userId), { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to duplicate file" },
            { status: 400 }
        );
    }
}
