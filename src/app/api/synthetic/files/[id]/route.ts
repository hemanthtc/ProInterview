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
    hydrateFilePayload,
} from "@/lib/syntheticAccess";
import { getJSON, uploadJSON, deleteObject, isS3Configured, pingS3 } from "@/utils/s3";

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
        await hydrateFilePayload(file);
        return NextResponse.json(serializeFile(file, auth.session.identifier));
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
        // Never pass Mongoose's internal `.schema` through — map to schemaFields only
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

        let savedInS3 = false;
        if (isS3Configured()) {
            const ping = await pingS3().catch(() => ({ ok: false }));
            if (ping.ok) {
                const s3Key = existing.s3Key || `synthetic/${auth.session.identifier}/${id}.json`;
                const s3Payload = {
                    data: Array.isArray(payload.data) ? payload.data : [],
                    textContent: typeof payload.textContent === "string" ? payload.textContent : ""
                };
                await uploadJSON(s3Key, s3Payload);

                payload.s3Key = s3Key;
                payload.data = [];
                payload.textContent = "";
                savedInS3 = true;
            }
        }

        if (!savedInS3) {
            payload.s3Key = "";
        }

        existing.set(payload);
        existing.userId = auth.session.identifier;
        existing.modifiedAt = new Date();
        await existing.save();

        const responseObj = await hydrateFilePayload(existing);
        return NextResponse.json(serializeFile(responseObj, auth.session.identifier));
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

        if (existing.s3Key && isS3Configured()) {
            await deleteObject(existing.s3Key).catch((err) => {
                console.error(`Failed to delete S3 object for key ${existing.s3Key}:`, err);
            });
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
