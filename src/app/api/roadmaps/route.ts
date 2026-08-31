import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Roadmap from "@/models/Roadmap";
import { getVerifiedSession } from "@/utils/auth";
import { runRoadmapCleanup } from "@/utils/roadmapCleanup";

// GET: Returns all roadmaps for the logged-in user (after running user-scoped expiry check/warnings)
export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();

        // Run user-specific cleanup and warn of upcoming expirations
        await runRoadmapCleanup(session.identifier);

        // Fetch remaining roadmaps (capped at 100 per user)
        const list = await Roadmap.find({ userIdentifier: session.identifier }).sort({ createdAt: -1 }).limit(100);

        const now = Date.now();
        const results = list.map((r) => {
            const daysRemaining = Math.max(0, Math.ceil((r.expiresAt.getTime() - now) / (1000 * 60 * 60 * 24)));
            return {
                id: r.id,
                course: r.course,
                company: r.company,
                location: r.location,
                additionalInfo: r.additionalInfo,
                roadmapData: r.roadmapData,
                tasksChecked: r.tasksChecked || {},
                phaseProgress: r.phaseProgress || {},
                createdAt: r.createdAt.getTime(),
                expiresAt: r.expiresAt.toISOString(),
                daysRemaining,
            };
        });

        return NextResponse.json(results);
    } catch (error: any) {
        console.error("GET /api/roadmaps error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch roadmaps" }, { status: 500 });
    }
}

// POST: Saves a new generated roadmap
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        const { id, course, company, location, additionalInfo, roadmapData, tasksChecked, phaseProgress } = body;
        if (!id || !roadmapData) {
            return NextResponse.json({ error: "Missing required roadmap parameters (id, roadmapData)." }, { status: 400 });
        }

        const finalCourse = (course && String(course).trim()) || 
                            (roadmapData?.title && String(roadmapData.title).trim()) || 
                            (company ? `${company} Preparation Roadmap` : "Career Preparation Roadmap");

        // Set expiresAt to exactly 30 days from now
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Find and replace or insert new roadmap record
        const r = await Roadmap.findOneAndUpdate(
            { id, userIdentifier: session.identifier },
            {
                id,
                userIdentifier: session.identifier,
                course: finalCourse,
                company: company || "Generic Company",
                location: location || "Remote",
                additionalInfo: additionalInfo || "",
                roadmapData,
                tasksChecked: tasksChecked || {},
                phaseProgress: phaseProgress || {},
                expiresAt,
                notifiedNearExpiry: false,
            },
            { new: true, upsert: true }
        );

        const daysRemaining = Math.max(0, Math.ceil((r.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        return NextResponse.json({
            id: r.id,
            course: r.course,
            company: r.company,
            location: r.location,
            additionalInfo: r.additionalInfo,
            roadmapData: r.roadmapData,
            tasksChecked: r.tasksChecked,
            phaseProgress: r.phaseProgress,
            createdAt: r.createdAt.getTime(),
            expiresAt: r.expiresAt.toISOString(),
            daysRemaining,
        });
    } catch (error: any) {
        console.error("POST /api/roadmaps error:", error);
        return NextResponse.json({ error: error.message || "Failed to save roadmap" }, { status: 500 });
    }
}
