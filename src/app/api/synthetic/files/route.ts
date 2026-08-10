import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    getOwnerName,
    buildFilePayload,
    serializeFile,
    SyntheticFile,
} from "@/lib/syntheticAccess";

export async function GET(req: NextRequest) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const scope = req.nextUrl.searchParams.get("scope") || "mine";
        const userId = auth.session.identifier;

        const query: any =
            scope === "all"
                ? { $or: [{ userId }, { visibility: "public" }] }
                : { userId };

        const files = await SyntheticFile.find(query)
            .sort({ modifiedAt: -1 })
            .lean();

        return NextResponse.json(files.map((f) => serializeFile(f, userId)));
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to list files" },
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
        const userId = auth.session.identifier;
        const ownerName = await getOwnerName(userId);
        const payload = buildFilePayload(body || {}, userId, ownerName);
        const created = await SyntheticFile.create(payload);
        return NextResponse.json(serializeFile(created, userId), { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to create file" },
            { status: 400 }
        );
    }
}
