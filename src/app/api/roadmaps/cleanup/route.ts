import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { runRoadmapCleanup } from "@/utils/roadmapCleanup";

export const dynamic = "force-dynamic";

async function isAuthorized(req: NextRequest): Promise<boolean> {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
    if (cronSecret && headerSecret && headerSecret === cronSecret) return true;

    const session = await getVerifiedSession(req);
    return Boolean(session && session.role === "admin");
}

// POST: Trigger global roadmap cleanup and notifications warning task
export async function POST(req: NextRequest) {
    try {
        if (!(await isAuthorized(req))) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
        }

        const { deletedCount, notifiedCount } = await runRoadmapCleanup();

        return NextResponse.json({
            success: true,
            deletedCount,
            notifiedCount,
        });
    } catch (error: any) {
        console.error("POST /api/roadmaps/cleanup error:", error);
        return NextResponse.json({ error: error.message || "Cleanup failed" }, { status: 500 });
    }
}
