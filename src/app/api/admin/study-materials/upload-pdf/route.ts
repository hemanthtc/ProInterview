import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, uploadBuffer, getJSON, uploadJSON } from "@/utils/s3";

const CATALOG_KEY = "study-materials/index.json";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized access: Please sign in as an Administrator." },
                { status: 401 }
            );
        }

        if (!isS3Configured()) {
            return NextResponse.json({ error: "S3 is not configured. Cannot upload PDF." }, { status: 503 });
        }

        const formData = await req.formData();
        const courseId = formData.get("courseId") as string;
        const subjectId = formData.get("subjectId") as string;
        const chapterId = formData.get("chapterId") as string;
        const file = formData.get("pdf") as File;

        if (!courseId || !subjectId || !chapterId || !file) {
            return NextResponse.json(
                { error: "Missing required fields: courseId, subjectId, chapterId, or pdf file." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const key = `study-materials/${courseId}/${subjectId}/${chapterId}/document.pdf`;

        // 1. Upload PDF buffer to S3
        await uploadBuffer({
            key,
            body: buffer,
            contentType: "application/pdf"
        });

        // 2. Update catalog index to mark hasPdf: true
        try {
            const catalog = await getJSON<any[]>(CATALOG_KEY);
            let updated = false;
            for (const group of catalog) {
                for (const course of group.courses) {
                    if (course.id === courseId) {
                        const subChapters = course.chapters[subjectId];
                        if (subChapters && subChapters.rows) {
                            subChapters.rows.forEach((r: any) => {
                                r.chapters.forEach((ch: any) => {
                                    if (ch.id === chapterId) {
                                        ch.hasPdf = true;
                                        updated = true;
                                    }
                                });
                            });
                        }
                    }
                }
            }
            if (updated) {
                await uploadJSON(CATALOG_KEY, catalog);
            }
        } catch (e) {
            console.error("Failed to update S3 catalog index with hasPdf flag:", e);
        }

        return NextResponse.json({ success: true, key });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to upload S3 PDF file" },
            { status: 500 }
        );
    }
}
