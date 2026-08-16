import { NextRequest, NextResponse } from "next/server";
import { getS3Client, getS3Bucket, isS3Configured } from "@/utils/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("course");
        const subjectId = searchParams.get("subject");
        const chapterId = searchParams.get("chapter");

        if (!courseId || !subjectId || !chapterId) {
            return NextResponse.json({ error: "Missing required parameters: course, subject, chapter." }, { status: 400 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({ error: "S3 is not configured." }, { status: 503 });
        }

        const key = `study-materials/${courseId}/${subjectId}/${chapterId}/document.pdf`;
        const bucket = getS3Bucket();

        try {
            const command = new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            });
            const response = await getS3Client().send(command);
            
            if (!response.Body) {
                return NextResponse.json({ error: "PDF document body is empty." }, { status: 404 });
            }

            // Return the readable stream directly for highly memory-efficient streaming
            return new Response(response.Body as any, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `inline; filename="${chapterId}.pdf"`,
                    "Cache-Control": "public, max-age=3600"
                }
            });
        } catch (err) {
            return NextResponse.json({ error: "PDF document not found on S3." }, { status: 404 });
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to stream S3 PDF file" },
            { status: 500 }
        );
    }
}
