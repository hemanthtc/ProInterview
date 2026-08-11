import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, pingS3 } from "@/utils/s3";

/** Health / config check for S3 (auth required). */
export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({
                configured: false,
                ok: false,
                message: "Set S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in .env",
            });
        }

        const ping = await pingS3();
        return NextResponse.json({ configured: true, ...ping });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "S3 status failed";
        return NextResponse.json({ configured: isS3Configured(), ok: false, error: message }, { status: 500 });
    }
}
