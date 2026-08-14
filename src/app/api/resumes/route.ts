import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, pingS3 } from "@/utils/s3";

function getS3ResumesKey(userIdentifier: string): string {
    const safeUser = userIdentifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `resume_builder_resumes/${safeUser}/saved_resumes.json`;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({ error: "S3 is not configured" }, { status: 503 });
        }

        // Ping S3 to check connectivity/online status
        const ping = await pingS3();
        if (!ping.ok) {
            return NextResponse.json({ error: `S3 is not accessible: ${ping.error}` }, { status: 503 });
        }

        const key = getS3ResumesKey(session.identifier);
        try {
            const data = await getJSON<any[]>(key);
            return NextResponse.json(data);
        } catch (err: any) {
            // If the object does not exist yet in S3, return an empty array
            if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
                return NextResponse.json([]);
            }
            throw err;
        }
    } catch (error: any) {
        console.error("GET /api/resumes error:", error);
        return NextResponse.json({ error: error.message || "Failed to load saved resumes" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({ error: "S3 is not configured" }, { status: 503 });
        }

        // Ping S3 to check connectivity/online status
        const ping = await pingS3();
        if (!ping.ok) {
            return NextResponse.json({ error: `S3 is not accessible: ${ping.error}` }, { status: 503 });
        }

        const resumes = await req.json();
        if (!Array.isArray(resumes)) {
            return NextResponse.json({ error: "Invalid payload: Expected an array of resumes" }, { status: 400 });
        }

        const key = getS3ResumesKey(session.identifier);
        await uploadJSON(key, resumes);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("POST /api/resumes error:", error);
        return NextResponse.json({ error: error.message || "Failed to save resumes" }, { status: 500 });
    }
}
