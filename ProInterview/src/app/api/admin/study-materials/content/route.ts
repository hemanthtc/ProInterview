import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON } from "@/utils/s3";

// GET — Retrieve page contents for a chapter
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("course");
        const subjectId = searchParams.get("subject");
        const chapterId = searchParams.get("chapter");

        if (!courseId || !subjectId || !chapterId) {
            return NextResponse.json({ error: "Missing required parameters: course, subject, chapter." }, { status: 400 });
        }

        const key = `study-materials/${courseId}/${subjectId}/${chapterId}/content.json`;

        if (!isS3Configured()) {
            return NextResponse.json({ pages: [] });
        }

        try {
            const data = await getJSON<{ pages: any[] }>(key);
            return NextResponse.json({ pages: data.pages || [] });
        } catch (err) {
            // Return empty pages list if content file doesn't exist yet
            return NextResponse.json({ pages: [] });
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to load chapter content" },
            { status: 500 }
        );
    }
}

// POST — Update page contents for a chapter
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized access: Please sign in as an Administrator." },
                { status: 401 }
            );
        }

        const { courseId, subjectId, chapterId, pages } = await req.json();

        if (!courseId || !subjectId || !chapterId || !Array.isArray(pages)) {
            return NextResponse.json({ error: "Invalid parameters. Required: courseId, subjectId, chapterId, and pages array." }, { status: 400 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({ error: "S3 is not configured. Cannot save content." }, { status: 503 });
        }

        const key = `study-materials/${courseId}/${subjectId}/${chapterId}/content.json`;
        await uploadJSON(key, { pages });

        return NextResponse.json({ success: true, key, pages });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to save chapter content" },
            { status: 500 }
        );
    }
}
