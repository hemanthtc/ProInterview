import { NextRequest, NextResponse } from "next/server";
import { isS3Configured, getJSON } from "@/utils/s3";
import seedCatalog from "@/data/studyMaterialsSeed.json";

const CATALOG_KEY = "study-materials/index.json";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("course");
        const subjectId = searchParams.get("subject");
        const chapterId = searchParams.get("chapter");

        // If specific chapter requested, return its content pages
        if (courseId && subjectId && chapterId) {
            const key = `study-materials/${courseId}/${subjectId}/${chapterId}/content.json`;
            if (!isS3Configured()) {
                return NextResponse.json({ pages: [] });
            }
            try {
                const data = await getJSON<{ pages: any[] }>(key);
                return NextResponse.json({ pages: data.pages || [] });
            } catch (err) {
                return NextResponse.json({ pages: [] });
            }
        }

        // Otherwise, return the main catalog index
        if (!isS3Configured()) {
            return NextResponse.json({ catalog: seedCatalog, s3Configured: false });
        }
        try {
            const catalog = await getJSON<any[]>(CATALOG_KEY);
            return NextResponse.json({ catalog, s3Configured: true });
        } catch (err) {
            return NextResponse.json({ catalog: seedCatalog, s3Configured: true, fallback: true });
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to retrieve study materials" },
            { status: 500 }
        );
    }
}
