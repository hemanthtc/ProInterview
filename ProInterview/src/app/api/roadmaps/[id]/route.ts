import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Roadmap from "@/models/Roadmap";
import { getVerifiedSession } from "@/utils/auth";

type Ctx = { params: Promise<{ id: string }> };

// DELETE: Deletes a specific roadmap
export async function DELETE(req: NextRequest, ctx: Ctx) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { id } = await ctx.params;
        await connectDB();

        const result = await Roadmap.deleteOne({ id, userIdentifier: session.identifier });
        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Roadmap not found or unauthorized." }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/roadmaps/[id] error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete roadmap" }, { status: 500 });
    }
}

// PATCH: Updates tasks checked or extends the expiry date
export async function PATCH(req: NextRequest, ctx: Ctx) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { id } = await ctx.params;
        await connectDB();

        const body = await req.json();
        const { tasksChecked, phaseProgress, extend } = body;

        const roadmap = await Roadmap.findOne({ id, userIdentifier: session.identifier });
        if (!roadmap) {
            return NextResponse.json({ error: "Roadmap not found or unauthorized." }, { status: 404 });
        }

        if (tasksChecked !== undefined) {
            roadmap.tasksChecked = tasksChecked;
            roadmap.markModified("tasksChecked");
        }

        if (phaseProgress !== undefined) {
            roadmap.phaseProgress = phaseProgress;
            roadmap.markModified("phaseProgress");
        }

        if (extend === true) {
            roadmap.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            roadmap.notifiedNearExpiry = false;
        }

        await roadmap.save();

        const daysRemaining = Math.max(0, Math.ceil((roadmap.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        return NextResponse.json({
            id: roadmap.id,
            course: roadmap.course,
            company: roadmap.company,
            location: roadmap.location,
            additionalInfo: roadmap.additionalInfo,
            roadmapData: roadmap.roadmapData,
            tasksChecked: roadmap.tasksChecked,
            phaseProgress: roadmap.phaseProgress,
            createdAt: roadmap.createdAt.getTime(),
            expiresAt: roadmap.expiresAt.toISOString(),
            daysRemaining,
        });
    } catch (error: any) {
        console.error("PATCH /api/roadmaps/[id] error:", error);
        return NextResponse.json({ error: error.message || "Failed to update roadmap" }, { status: 500 });
    }
}
