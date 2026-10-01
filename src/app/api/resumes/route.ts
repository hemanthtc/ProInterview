import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, pingS3 } from "@/utils/s3";
import connectDB from "@/utils/db";
import { SavedResumeModel } from "@/models/SavedResume";

export const dynamic = "force-dynamic";

function getS3ResumesKey(userIdentifier: string): string {
    const safeUser = userIdentifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `resume_builder_resumes/${safeUser}/saved_resumes.json`;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        // Try S3 first if configured and accessible
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3ResumesKey(session.identifier);
                try {
                    const data = await getJSON<any[]>(key);
                    return NextResponse.json(data);
                } catch (err: any) {
                    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
                        return NextResponse.json([]);
                    }
                }
            }
        }

        // Seamless fallback to MongoDB persistence
        try {
            await connectDB();
            const doc = await SavedResumeModel.findOne({ identifier: session.identifier });
            return NextResponse.json(doc?.resumes || []);
        } catch (dbErr) {
            console.warn("MongoDB resumes retrieval fallback note:", dbErr);
            return NextResponse.json([]);
        }
    } catch (error: any) {
        console.error("GET /api/resumes error:", error);
        return NextResponse.json({ error: error.message || "Failed to load saved resumes" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const resumes = await req.json();
        if (!Array.isArray(resumes)) {
            return NextResponse.json({ error: "Invalid payload: Expected an array of resumes" }, { status: 400 });
        }

        let savedToS3 = false;
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                try {
                    const key = getS3ResumesKey(session.identifier);
                    await uploadJSON(key, resumes);
                    savedToS3 = true;
                } catch (err) {
                    console.warn("Failed saving resumes to S3, falling back to MongoDB:", err);
                }
            }
        }

        // Save to MongoDB as primary or reliable backup
        try {
            await connectDB();
            await SavedResumeModel.findOneAndUpdate(
                { identifier: session.identifier },
                { $set: { resumes, updatedAt: new Date() } },
                { upsert: true, new: true }
            );
        } catch (mongoErr) {
            if (!savedToS3) {
                console.error("Failed saving resumes to MongoDB:", mongoErr);
                return NextResponse.json({ error: "Failed to persist resumes to storage" }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("POST /api/resumes error:", error);
        return NextResponse.json({ error: error.message || "Failed to save resumes" }, { status: 500 });
    }
}
