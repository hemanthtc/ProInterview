import { NextRequest, NextResponse } from "next/server";
import { connectDB, requireSession, SyntheticFile } from "@/lib/syntheticAccess";
import { uploadJSON, isS3Configured } from "@/utils/s3";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    if (auth.session.role !== "admin") {
        return NextResponse.json(
            { error: "Forbidden. Admin access required." },
            { status: 403 }
        );
    }

    if (!isS3Configured()) {
        return NextResponse.json(
            { error: "AWS S3 is not configured in environment variables." },
            { status: 400 }
        );
    }

    try {
        await connectDB();
        
        // Find all files that do not have an s3Key set yet
        const files = await SyntheticFile.find({
            $or: [
                { s3Key: { $exists: false } },
                { s3Key: "" },
                { s3Key: null }
            ]
        });

        let migratedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const file of files) {
            try {
                const fileId = String(file._id);
                const s3Key = `synthetic/${file.userId}/${fileId}.json`;

                const payload = {
                    data: Array.isArray(file.data) ? file.data : [],
                    textContent: typeof file.textContent === "string" ? file.textContent : ""
                };

                // Upload payload to S3
                await uploadJSON(s3Key, payload);

                // Update document in MongoDB (clear payload to save space)
                file.s3Key = s3Key;
                file.data = [];
                file.textContent = "";
                await file.save();

                migratedCount++;
            } catch (err: any) {
                errorCount++;
                errors.push(`File ${file._id} (${file.filename}): ${err.message || err}`);
            }
        }

        return NextResponse.json({
            ok: true,
            totalFound: files.length,
            migratedCount,
            errorCount,
            errors
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Migration failed" },
            { status: 500 }
        );
    }
}
