import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    canWriteFile,
    serializeFile,
    SyntheticFile,
} from "@/lib/syntheticAccess";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const { id } = await ctx.params;
        const file = await SyntheticFile.findById(id);
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        if (!canWriteFile(file, auth.session.identifier)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const nextVisibility =
            body?.visibility === "public" || body?.visibility === "private"
                ? body.visibility
                : file.visibility === "public"
                  ? "private"
                  : "public";

        file.visibility = nextVisibility;
        file.modifiedAt = new Date();
        await file.save();

        return NextResponse.json(serializeFile(file, auth.session.identifier));
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update visibility" },
            { status: 400 }
        );
    }
}
