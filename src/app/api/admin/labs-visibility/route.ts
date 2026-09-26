import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getVerifiedSession } from "@/utils/auth";
import LabsVisibilityConfig from "@/models/LabsVisibilityConfig";

export async function GET() {
    try {
        await connectDB();
        const config = await LabsVisibilityConfig.findOne({}).lean();
        return NextResponse.json({ hiddenTools: config?.hiddenTools || [] });
    } catch (_error: any) {
        // If DB is unavailable, return empty (nothing hidden) so the page still works
        return NextResponse.json({ hiddenTools: [] });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized access: Please sign in as an Administrator." },
                { status: 403 }
            );
        }

        await connectDB();
        const { hiddenTools } = await req.json();

        if (!Array.isArray(hiddenTools)) {
            return NextResponse.json(
                { error: "Invalid payload format. Expected hiddenTools array." },
                { status: 400 }
            );
        }

        await LabsVisibilityConfig.findOneAndUpdate(
            {},
            {
                hiddenTools,
                updatedBy: session.identifier,
            },
            { upsert: true, returnDocument: 'after' }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update labs visibility configuration" },
            { status: 500 }
        );
    }
}
