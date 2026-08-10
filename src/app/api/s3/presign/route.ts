import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import {
    buildObjectKey,
    createPresignedUploadUrl,
    isS3Configured,
    type S3Prefix,
} from "@/utils/s3";

const ALLOWED_PREFIXES: S3Prefix[] = [
    "resumes",
    "profile-photos",
    "synthetic",
    "uploads",
    "scorecards",
];

const ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/json",
    "application/zip",
];

/**
 * POST { prefix, filename, contentType }
 * → { uploadUrl, key, publicUrl, expiresIn }
 *
 * Client PUTs the file bytes to uploadUrl, then saves key/publicUrl on profile.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        if (!isS3Configured()) {
            return NextResponse.json(
                {
                    error: "S3 is not configured. Set S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.",
                    configured: false,
                },
                { status: 503 }
            );
        }

        const rl = rateLimit(`s3-presign:${session.identifier}`, { limit: 40, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const body = await req.json();
        const prefix = body?.prefix as S3Prefix;
        const filename = typeof body?.filename === "string" ? body.filename : "file";
        const contentType =
            typeof body?.contentType === "string" ? body.contentType : "application/octet-stream";

        if (!ALLOWED_PREFIXES.includes(prefix)) {
            return NextResponse.json(
                { error: `Invalid prefix. Allowed: ${ALLOWED_PREFIXES.join(", ")}` },
                { status: 400 }
            );
        }

        if (!ALLOWED_CONTENT_TYPES.includes(contentType) && !contentType.startsWith("image/")) {
            return NextResponse.json({ error: `Unsupported content type: ${contentType}` }, { status: 400 });
        }

        const key = buildObjectKey(prefix, session.identifier, filename);
        const signed = await createPresignedUploadUrl({ key, contentType });

        return NextResponse.json({
            configured: true,
            ...signed,
        });
    } catch (error: unknown) {
        console.error("s3/presign", error);
        const message = error instanceof Error ? error.message : "Failed to create upload URL";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        configured: isS3Configured(),
        prefixes: ALLOWED_PREFIXES,
    });
}
