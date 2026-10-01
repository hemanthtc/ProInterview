import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import {
    isS3Configured,
    uploadBuffer,
} from "@/utils/s3";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const rl = rateLimit(`community-upload:${session.identifier}`, { limit: 20, windowMs: 5 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many uploads. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const data = await req.formData();
        const file = data.get("file") as File | null;
        const roomSlug = data.get("roomSlug") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const cleanRoomSlug = String(roomSlug || "general").trim().toLowerCase();
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
            return NextResponse.json({ error: "Unsupported file type. Only images and videos are allowed." }, { status: 400 });
        }

        // General chat validation: Images only, no video.
        if (cleanRoomSlug === "general" && !isImage) {
            return NextResponse.json({ error: "Only image uploads are allowed in the general chat." }, { status: 400 });
        }

        // File size validation
        if (isImage && file.size > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: "Image exceeds 5MB size limit." }, { status: 413 });
        }
        if (isVideo && file.size > MAX_VIDEO_SIZE) {
            return NextResponse.json({ error: "Video exceeds 15MB size limit." }, { status: 413 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. S3 Storage Flow
        if (isS3Configured()) {
            const prefix = cleanRoomSlug === "feedback" ? "feedback/" : "community/";
            const safeUser = session.identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
            const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
            const key = `${prefix}${safeUser}/${Date.now()}_${safeFileName}`;

            const result = await uploadBuffer({
                key,
                body: buffer,
                contentType: file.type || "application/octet-stream",
                metadata: {
                    uploader: session.identifier.slice(0, 100),
                    originalName: file.name.slice(0, 100),
                    roomSlug: cleanRoomSlug,
                },
            });

            return NextResponse.json({
                url: result.url,
                type: file.type,
                storedInS3: true,
                key: result.key,
            });
        }

        // 2. Base64 Fallback Flow
        const base64Data = buffer.toString("base64");
        const base64Url = `data:${file.type};base64,${base64Data}`;

        return NextResponse.json({
            url: base64Url,
            type: file.type,
            storedInS3: false,
        });

    } catch (error: unknown) {
        console.error("Community file upload failed:", error);
        const message = error instanceof Error ? error.message : "Failed to process upload";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
