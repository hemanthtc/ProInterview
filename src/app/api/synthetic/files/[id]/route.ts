import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    canReadFile,
    canWriteFile,
    buildFilePayload,
    serializeFile,
    getOwnerName,
    SyntheticFile,
} from "@/lib/syntheticAccess";

import {
    uploadSyntheticPayloadToS3,
    readSyntheticPayloadFromS3,
    deleteSyntheticPayloadFromS3,
} from "@/utils/s3Server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const file = await SyntheticFile.findById(id).lean();
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        if (!canReadFile(file as any, auth.session.identifier)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const serialized = serializeFile(file, auth.session.identifier);

        // Fetch physical dataset / document payload from AWS S3 if s3Key exists
        if (file.s3Key) {
            const s3Content = await readSyntheticPayloadFromS3(file.s3Key);
            if (s3Content) {
                if (file.contentType === "document" || file.contentType === "code") {
                    serialized.textContent = s3Content;
                } else if (typeof s3Content === "object") {
                    serialized.data = Array.isArray(s3Content) ? s3Content : [s3Content];
                } else {
                    try {
                        serialized.data = JSON.parse(s3Content);
                    } catch {
                        serialized.textContent = s3Content;
                    }
                }
            }
        }

        return NextResponse.json(serialized);
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to load file" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const existing = await SyntheticFile.findById(id);
        if (!existing) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        if (!canWriteFile(existing, auth.session.identifier)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const ownerName = existing.ownerName || (await getOwnerName(auth.session.identifier));
        const existingObj = existing.toObject({ virtuals: false, getters: false });
        const { schema: _ignoredSchema, ...safeExisting } = existingObj as any;
        const payload = buildFilePayload(
            {
                ...safeExisting,
                ...body,
                schemaFields: Array.isArray(body?.schema)
                    ? body.schema
                    : Array.isArray(body?.schemaFields)
                      ? body.schemaFields
                      : safeExisting.schemaFields,
                visibility: body.visibility ?? existing.visibility,
            },
            auth.session.identifier,
            ownerName
        );

        // Update physical content in AWS S3
        const contentPayload = payload.contentType === "document" || payload.contentType === "code"
            ? payload.textContent
            : payload.data;

        const updatedS3Key = await uploadSyntheticPayloadToS3({
            userId: auth.session.identifier,
            fileId: existing._id.toString(),
            payload: contentPayload,
            filename: payload.filename,
            visibility: payload.visibility,
        });

        if (updatedS3Key) {
            payload.s3Key = updatedS3Key;
        }

        existing.set(payload);
        existing.userId = auth.session.identifier;
        existing.modifiedAt = new Date();
        await existing.save();
        return NextResponse.json(serializeFile(existing, auth.session.identifier));
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update file" },
            { status: 400 }
        );
    }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const existing = await SyntheticFile.findById(id);
        if (!existing) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        if (!canWriteFile(existing, auth.session.identifier)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (existing.s3Key) {
            await deleteSyntheticPayloadFromS3(existing.s3Key);
        }

        await existing.deleteOne();
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to delete file" },
            { status: 500 }
        );
    }
}
