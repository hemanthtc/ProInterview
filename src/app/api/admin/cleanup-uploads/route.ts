import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, listS3ObjectsWithDetails, deleteS3ObjectsBulk } from "@/utils/s3";


async function checkAuth(req: NextRequest): Promise<boolean> {
    // 1. Session-based Admin check
    const session = await getVerifiedSession(req);
    if (session && session.role === "admin") {
        return true;
    }

    // 2. Cron-based auth check
    const authHeader = req.headers.get("Authorization");
    const secretParam = req.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && cronSecret !== "dummy") {
        const isCronToken = authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret;
        if (isCronToken) return true;
    }

    return false;
}

export async function GET(req: NextRequest) {
    try {
        const isAuthorized = await checkAuth(req);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in as admin." }, { status: 401 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({
                configured: false,
                files: [],
                message: "S3 is not active. In-memory temporary uploads are not saved on the server.",
            });
        }

        const allUploads = await listS3ObjectsWithDetails("uploads/");
        const now = Date.now();

        const expiredFiles = allUploads
            .map(f => {
                const ageMs = f.lastModified ? now - new Date(f.lastModified).getTime() : 0;
                const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
                return {
                    key: f.key,
                    name: f.key.split("/").pop() || "unknown",
                    lastModified: f.lastModified,
                    size: f.size || 0,
                    ageDays,
                };
            })
            .filter(f => f.ageDays >= 7);

        return NextResponse.json({
            configured: true,
            files: expiredFiles,
            totalFiles: allUploads.length,
            expiredCount: expiredFiles.length,
        });
    } catch (error: any) {
        console.error("GET /api/admin/cleanup-uploads error:", error);
        return NextResponse.json({ error: error.message || "Failed to list uploads" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const isAuthorized = await checkAuth(req);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in as admin." }, { status: 401 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({
                configured: false,
                success: true,
                deletedCount: 0,
                message: "S3 is not active. In-memory temporary uploads are not saved on the server.",
            });
        }

        const allUploads = await listS3ObjectsWithDetails("uploads/");
        const now = Date.now();

        const expiredKeys = allUploads
            .filter(f => {
                const ageMs = f.lastModified ? now - new Date(f.lastModified).getTime() : 0;
                const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
                return ageDays >= 7;
            })
            .map(f => f.key);

        if (expiredKeys.length > 0) {
            // Delete in chunks of 1000 keys (S3 limit per DeleteObjects command)
            const chunkSize = 1000;
            for (let i = 0; i < expiredKeys.length; i += chunkSize) {
                const chunk = expiredKeys.slice(i, i + chunkSize);
                await deleteS3ObjectsBulk(chunk);
            }
        }

        return NextResponse.json({
            success: true,
            configured: true,
            deletedCount: expiredKeys.length,
            deletedKeys: expiredKeys,
        });
    } catch (error: any) {
        console.error("POST /api/admin/cleanup-uploads error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete uploads" }, { status: 500 });
    }
}
