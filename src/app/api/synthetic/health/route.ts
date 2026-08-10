import { NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    getOwnerName,
} from "@/lib/syntheticAccess";

export async function GET() {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const ownerName = await getOwnerName(auth.session.identifier);
        return NextResponse.json({
            ok: true,
            storage: "mongodb",
            userId: auth.session.identifier,
            ownerName,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Storage health check failed" },
            { status: 500 }
        );
    }
}
