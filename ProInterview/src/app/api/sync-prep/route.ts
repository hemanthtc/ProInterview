import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import connectDB from "@/utils/db";
import CloudSession, { type PrepProgressBlob } from "@/models/CloudSession";
import {
    ensurePrepProgressShape,
    mergePrepProgress,
    emptyPrepProgress,
} from "@/utils/usageMeter";

export const dynamic = "force-dynamic";

async function getOrCreate(identifier: string) {
    let blob = await CloudSession.findOne({ identifier });
    if (!blob) {
        blob = await CloudSession.create({
            identifier,
            sessions: [],
            prepPacks: [],
            spacedDrills: [],
            prepProgress: emptyPrepProgress(),
        });
    }
    return blob;
}

export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const blob = await getOrCreate(session.identifier);
        return NextResponse.json({
            prepProgress: ensurePrepProgressShape(blob.prepProgress as PrepProgressBlob | undefined),
        });
    } catch (error: unknown) {
        console.error("sync-prep GET error:", error);
        const message = error instanceof Error ? error.message : "Failed to load prep progress";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const incoming = body?.prepProgress as PrepProgressBlob | undefined;
        if (!incoming || typeof incoming !== "object") {
            return NextResponse.json({ error: "prepProgress required" }, { status: 400 });
        }

        await connectDB();
        const blob = await getOrCreate(session.identifier);
        blob.prepProgress = mergePrepProgress(
            blob.prepProgress as PrepProgressBlob | undefined,
            incoming
        );
        blob.markModified("prepProgress");
        await blob.save();

        return NextResponse.json({
            success: true,
            prepProgress: ensurePrepProgressShape(blob.prepProgress as PrepProgressBlob | undefined),
        });
    } catch (error: unknown) {
        console.error("sync-prep POST error:", error);
        const message = error instanceof Error ? error.message : "Failed to sync prep progress";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
